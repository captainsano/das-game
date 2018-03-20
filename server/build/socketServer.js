"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types_1 = require("./Types");
const GameState_1 = require("./GameState");
const rxjs_1 = require("rxjs");
const gameplay_1 = require("./loops/gameplay");
const dragonAttack_1 = require("./loops/dragonAttack");
const createObservableFromSocketEvent = function createObservableFromSocketEvent(socket, eventName) {
    return rxjs_1.Observable.create((observer) => {
        const listener = (...args) => observer.next(args);
        socket.on(eventName, listener);
        return () => socket.removeListener(eventName, listener);
    });
};
function socketServer(io, thisProcess, mastersList) {
    let currentMasterList = [...mastersList];
    let masterLive = false;
    let isMaster = false;
    // Try establishing connection to master
    const gameState = GameState_1.GameState.getInstance();
    const primaryEventQueue = [];
    const forwardEventQueue = [];
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
    if (thisProcess === mastersList[0]) {
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
    }
    // Handle client connection (new and reconnection)
    io.on('connection', (socket) => {
        rxjs_1.Observable.merge(createObservableFromSocketEvent(socket, 'SPAWN')
            .map(([, respond]) => {
            (isMaster ? primaryEventQueue : forwardEventQueue).push({
                action: 'SPAWN_UNIT',
                unitId: -1,
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
    // Periodically pull events from forwardEventQueue and forward
    // TODO:
    // AI gameplay (if current master)
    dragonAttack_1.dragonAttack(() => isMaster, (e) => primaryEventQueue.push(e));
    // Periodically broadcast the current game state to all the connected clients
    rxjs_1.Observable.interval(Types_1.GAMEPLAY_INTERVAL * 100)
        .subscribe(() => {
        io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}
exports.default = socketServer;
