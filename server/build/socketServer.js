"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameState_1 = require("./GameState");
const rxjs_1 = require("rxjs");
const createObservableFromSocketEvent = function createObservableFromSocketEvent(socket, eventName) {
    return rxjs_1.Observable.create((observer) => {
        const listener = (...args) => observer.next(args);
        socket.on(eventName, listener);
        return () => socket.removeListener(eventName, listener);
    });
};
function socketServer(io) {
    const gameState = GameState_1.GameState.getInstance();
    const primaryEventQueue = [];
    io.on('connection', (socket) => {
        console.log('---> Got connection from ', socket.id);
        rxjs_1.Observable.merge(createObservableFromSocketEvent(socket, 'SPAWN')
            .map(([, respond]) => {
            const newUnitId = gameState.spawnUnit();
            respond && respond(newUnitId);
            return newUnitId;
        }), createObservableFromSocketEvent(socket, 'RECONNECT')
            .map(([{ id }, respond]) => {
            if (gameState.hasUnit(id)) {
                respond && respond(null);
                return id;
            }
            const newUnitId = gameState.spawnUnit();
            respond && respond(newUnitId);
            return newUnitId;
        }))
            .flatMap((unitId) => {
            socket.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
            return createObservableFromSocketEvent(socket, 'MESSAGE')
                .do(([{ timestamp, action }]) => {
                primaryEventQueue.push({
                    unitId,
                    action,
                    timestamp,
                });
            });
        })
            .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
            .subscribe();
    });
    // Periodically pull an event from the event queue and apply to game state
    rxjs_1.Observable.interval(50)
        .subscribe(() => {
        // TODO: Handle events with very old timestamp
        if (primaryEventQueue.length === 0)
            return;
        const nextEvent = primaryEventQueue.shift();
        // TODO: Check timestamp
        switch (nextEvent.action) {
            case 'UP': {
                const location = gameState.getUnitLocation(nextEvent.unitId);
                if (location) {
                    gameState.moveUnit([location[0], location[1]], [location[0], location[1] - 1]);
                }
                break;
            }
            case 'DOWN': {
                const location = gameState.getUnitLocation(nextEvent.unitId);
                if (location) {
                    gameState.moveUnit([location[0], location[1]], [location[0], location[1] + 1]);
                }
                break;
            }
            case 'RIGHT': {
                const location = gameState.getUnitLocation(nextEvent.unitId);
                if (location) {
                    gameState.moveUnit([location[0], location[1]], [location[0] + 1, location[1]]);
                }
                break;
            }
            case 'LEFT': {
                const location = gameState.getUnitLocation(nextEvent.unitId);
                if (location) {
                    gameState.moveUnit([location[0], location[1]], [location[0] - 1, location[1]]);
                }
                break;
            }
        }
    });
    // Periodically broadcast the current game state to all the connected clients
    rxjs_1.Observable.interval(100)
        .map(() => gameState.board.toString())
        .distinctUntilChanged()
        .subscribe(() => {
        io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}
exports.default = socketServer;
