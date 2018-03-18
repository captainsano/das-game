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
    io.on('connection', (socket) => {
        console.log('---> Got connection from ', socket.id);
        rxjs_1.Observable.merge(createObservableFromSocketEvent(socket, 'SPAWN')
            .do(([, respond]) => {
            const newUnitId = gameState.spawnUnit();
            respond && respond(newUnitId);
        }), createObservableFromSocketEvent(socket, 'RECONNECT')
            .do(([{ id }, respond]) => {
            if (gameState.hasUnit(id)) {
                respond && respond(null);
            }
            else {
                const newId = gameState.spawnUnit();
                respond && respond(newId);
            }
        }))
            .flatMap(() => {
            return rxjs_1.Observable.empty();
        })
            .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
            .subscribe();
    });
    // Periodically broadcast the current game state to all the connected clients
    rxjs_1.Observable
        .interval()
        .delay(1000)
        .subscribe(() => {
        io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}
exports.default = socketServer;
