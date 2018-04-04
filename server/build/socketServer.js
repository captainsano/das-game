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
const clientSocket = require("socket.io-client");
const Logger_1 = require("./Logger");
const log = Logger_1.Logger.getInstance('SocketServer');
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
        const spawnResponders = {
            // Default buffing function
            '': () => null
        };
        // Initialize the game with 20 dragons
        const initializeDragons = () => {
            // for (let i = 0; i < 20; i++) {
            //   primaryEventQueue.push({
            //     at: gameState.getRandomVacantSquare(),
            //     timestamp: gameState.timestamp,
            //     unitId: -1,
            //     action: 'SPAWN_UNIT',
            //     type: 'dragon',
            //   } as SpawnUnitEvent)
            // }
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
                    if (server === thisProcess) {
                        log.info('Becoming a master');
                        isMaster = true;
                        // Take any item pending in forward queue and put it in primary queue
                        let m = forwardEventQueue.shift();
                        while (m) {
                            primaryEventQueue.push(m);
                            m = forwardEventQueue.shift();
                        }
                        return;
                    }
                    isMaster = false;
                    log.info({ server }, `Evaluating potential master`);
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
                        if (!isMaster && server) {
                            const s = clientSocket.connect(`http://${server}`);
                            s.on('STATE_UPDATE', ({ board, timestamp }) => {
                                log.info({ timestamp, board }, 'Got state update from master');
                                gameState.setState(board, timestamp);
                            });
                            // Periodically forward events
                            return rxjs_1.Observable
                                .interval(Types_1.GAMEPLAY_INTERVAL)
                                .filter(() => currentMaster === server)
                                .subscribe(() => {
                                if (s.connected) {
                                    const m = forwardEventQueue.shift();
                                    if (m) {
                                        log.info({ server }, 'Forwarding action to master');
                                        // Consider SPAWN_UNIT as a synchronous action
                                        if (m.action === 'SPAWN_UNIT') {
                                            s.emit('FORWARD', m, (unitId) => {
                                                if (m.socketId && spawnResponders[m.socketId || '']) {
                                                    spawnResponders[m.socketId || ''](unitId);
                                                    delete spawnResponders[m.socketId || ''];
                                                }
                                            });
                                        }
                                        else {
                                            s.emit('FORWARD', m);
                                        }
                                    }
                                }
                            });
                        }
                        else if (!server) {
                            log.info('Looking for masters');
                            forwardLoop();
                        }
                        return rxjs_1.Observable.empty();
                    })
                        .subscribe();
                }
                else {
                    log.info('Exhausted masters list');
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
                .filter(() => !gameState.replaying)
                .do(([e, respond]) => {
                log.info({ socketId: socket.id }, 'Got a new connection');
                // Attach the synchronous responder in case of SPAWN_UNIT
                if (e.action === 'SPAWN_UNIT') {
                    e.respond = respond;
                }
                primaryEventQueue.push(e);
            })
                .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
                .subscribe();
            // Connection from clients
            rxjs_1.Observable.merge(createObservableFromSocketEvent(socket, 'SPAWN')
                .map(([, respond]) => {
                log.info({ socketId: socket.id }, 'Got spawn request from client');
                spawnResponders[socket.id] = respond;
                (isMaster ? primaryEventQueue : forwardEventQueue).push({
                    action: 'SPAWN_UNIT',
                    type: 'player',
                    timestamp: gameState.timestamp,
                    at: gameState.getRandomVacantSquare(),
                    respond,
                    socketId: socket.id,
                });
            }), createObservableFromSocketEvent(socket, 'RECONNECT')
                .map(([{ id }, respond]) => {
                log.info({ socketId: socket.id, unitId: id }, 'Got a reconnect request from client');
                if (gameState.hasUnit(id)) {
                    respond && respond(null);
                }
                else {
                    spawnResponders[socket.id] = respond;
                    (isMaster ? primaryEventQueue : forwardEventQueue).push({
                        action: 'SPAWN_UNIT',
                        unitId: -1,
                        type: 'player',
                        timestamp: gameState.timestamp,
                        at: gameState.getRandomVacantSquare(),
                        respond,
                        socketId: socket.id,
                    });
                }
            }))
                .flatMap(() => {
                socket.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
                // Listen to messages from client
                return createObservableFromSocketEvent(socket, 'MESSAGE')
                    .do(([{ unitId, timestamp, action }]) => {
                    // Ping message to register the socket
                    if (action === 'PING') {
                        socket['unitId'] = unitId;
                        return;
                    }
                    // Process events if master, else forward
                    if (isMaster && !gameState.replaying) {
                        primaryEventQueue.push({ unitId, action, timestamp });
                    }
                    else {
                        forwardEventQueue.push({ unitId, action, timestamp });
                    }
                });
            })
                .takeUntil(createObservableFromSocketEvent(socket, 'disconnect')
                .delay(10000)
                .do(() => {
                const action = { unitId: socket['unitId'] || -999, action: 'REMOVE_UNIT', timestamp: gameState.timestamp };
                if (isMaster) {
                    primaryEventQueue.push(action);
                }
                else {
                    forwardEventQueue.push(action);
                }
            })
                .delay(1000))
                .subscribe();
        });
        // Periodically pull events from the primaryQueue and process
        gameplay_1.gameplay(() => primaryEventQueue.shift());
        // AI gameplay (if current master)
        dragonAttack_1.dragonAttack(() => isMaster, (e) => primaryEventQueue.push(e));
        // Periodically cleanup the board for stale units that did not make any movements
        let lastUnitPosition = {};
        rxjs_1.Observable.interval(10000)
            .filter(() => isMaster)
            .subscribe(() => {
            let unitsWithPosition = [];
            for (let i = 0; i < gameState.board.length; i++) {
                for (let j = 0; j < gameState.board.length; j++) {
                    if (gameState.board[i][j] && gameState.board[i][j].type === 'player') {
                        unitsWithPosition.push([gameState.board[i][j].id, [i, j]]);
                    }
                }
            }
            // Remaining units, remove from the board
            unitsWithPosition.forEach(([id, currentPosition]) => {
                if (lastUnitPosition[id] && lastUnitPosition[id].toString() === currentPosition.toString()) {
                    log.info({ unitId: id }, 'Found a stale unit');
                    const e = { timestamp: gameState.timestamp, unitId: id, action: 'REMOVE_UNIT' };
                    primaryEventQueue.push(e);
                }
                lastUnitPosition[id] = currentPosition;
            });
        });
        // Periodically broadcast the current game state to all the connected clients
        rxjs_1.Observable.interval(Types_1.GAMEPLAY_INTERVAL * 100)
            .filter(() => !gameState.replaying)
            .subscribe(() => {
            io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
        });
    });
}
exports.default = socketServer;
//# sourceMappingURL=socketServer.js.map