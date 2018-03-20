"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Types_1 = require("./Types");
const GameState_1 = require("./GameState");
const rxjs_1 = require("rxjs");
const gameplay_1 = require("./loops/gameplay");
const dragonAttack_1 = require("./loops/dragonAttack");
const axios_1 = require("axios");
const createObservableFromSocketEvent = function createObservableFromSocketEvent(socket, eventName) {
    return rxjs_1.Observable.create((observer) => {
        const listener = (...args) => observer.next(args);
        socket.on(eventName, listener);
        return () => socket.removeListener(eventName, listener);
    });
};
function socketServer(io, thisProcess, mastersList) {
    return __awaiter(this, void 0, void 0, function* () {
        let currentMasterList = [...mastersList];
        let isMaster = false;
        // Try establishing connection to master
        const gameState = GameState_1.GameState.getInstance();
        const primaryEventQueue = [];
        const forwardEventQueue = [];
        let currentMaster = '';
        // Initialize the game with 20 dragons
        const initializeDragons = () => {
            for (let i = 0; i < 20; i++) {
                primaryEventQueue.push({
                    at: gameState.getRandomVacantSquare(),
                    timestamp: gameState.timestamp,
                    unitId: -1,
                    action: 'SPAWN_UNIT',
                    type: 'dragon',
                });
            }
        };
        // Handle connection to master
        if (thisProcess === currentMasterList[0]) {
            isMaster = true;
            initializeDragons();
        }
        else {
            isMaster = false;
            // Drain things in primaryEventQueue and put it in forward queue
            let e = primaryEventQueue.shift();
            while (e != null) {
                forwardEventQueue.push(e);
            }
            // ---- Establish socket connection to master ----
            // Determine if master is available
            const forwardLoop = () => {
                if (currentMasterList.length > 0) {
                    const server = currentMasterList.shift();
                    currentMaster = server;
                    console.log('--> Evaluating ', server);
                    if (server === thisProcess) {
                        isMaster = true;
                        return;
                    }
                    isMaster = false;
                    return rxjs_1.Observable
                        .interval(1000)
                        .startWith(0)
                        .concatMap(() => __awaiter(this, void 0, void 0, function* () {
                        // Check if master is live
                        const ATTEMPTS = 3;
                        for (let i = 0; i < ATTEMPTS; i++) {
                            try {
                                const result = yield axios_1.default.get(`http://${server}/health`);
                                if (result.status === 200) {
                                    return server;
                                }
                            }
                            catch (e) { }
                        }
                        return '';
                    }))
                        .distinctUntilChanged()
                        .do((server) => {
                        console.log('---> Got server: ', server);
                        if (!isMaster && server) {
                            // Periodically forward events
                            return rxjs_1.Observable
                                .interval(2500)
                                .filter(() => currentMaster === server)
                                .subscribe(() => {
                                // Forward events to server
                                console.log(`---> Forwarding to ${server}`);
                            });
                        }
                        else if (!server) {
                            forwardLoop();
                        }
                        return rxjs_1.Observable.empty();
                    })
                        .subscribe();
                }
                else {
                    console.log('---> No servers exist!');
                    process.exit(0);
                }
            };
            forwardLoop();
        }
        // Handle client connection (new and reconnection)
        io.on('connection', (socket) => {
            // Connection from other servers
            createObservableFromSocketEvent(socket, 'FORWARD')
                .filter(() => isMaster)
                .do(([e]) => {
                console.log('--> Got an event from another server');
                primaryEventQueue.push(e);
            })
                .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
                .subscribe();
            // Connection from clients
            rxjs_1.Observable.merge(createObservableFromSocketEvent(socket, 'SPAWN')
                .map(([, respond]) => {
                (isMaster ? primaryEventQueue : forwardEventQueue).push({
                    action: 'SPAWN_UNIT',
                    type: 'player',
                    timestamp: gameState.timestamp,
                    at: gameState.getRandomVacantSquare(),
                    respond,
                });
            }), createObservableFromSocketEvent(socket, 'RECONNECT')
                .map(([{ id }, respond]) => {
                if (gameState.hasUnit(id)) {
                    respond && respond(null);
                }
                else {
                    (isMaster ? primaryEventQueue : forwardEventQueue).push({
                        action: 'SPAWN_UNIT',
                        unitId: -1,
                        type: 'player',
                        timestamp: gameState.timestamp,
                        at: gameState.getRandomVacantSquare(),
                        respond,
                    });
                }
            }))
                .flatMap(() => {
                socket.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
                // Listen to messages from client
                return createObservableFromSocketEvent(socket, 'MESSAGE')
                    .do(([{ unitId, timestamp, action }]) => {
                    // Process events if master, else forward
                    if (isMaster) {
                        primaryEventQueue.push({ unitId, action, timestamp });
                    }
                    else {
                        forwardEventQueue.push({ unitId, action, timestamp });
                    }
                });
            })
                .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
                .subscribe();
        });
        // Periodically pull events from the primaryQueue and process
        gameplay_1.gameplay(() => primaryEventQueue.shift());
        // AI gameplay (if current master)
        dragonAttack_1.dragonAttack(() => isMaster, (e) => primaryEventQueue.push(e));
        // Periodically broadcast the current game state to all the connected clients
        rxjs_1.Observable.interval(Types_1.GAMEPLAY_INTERVAL * 100)
            .subscribe(() => {
            io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
        });
    });
}
exports.default = socketServer;
