"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameState_1 = require("./GameState");
const rxjs_1 = require("rxjs");
const GAMEPLAY_INTERVAL = 100;
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
    // Initialize the game with 20 dragons
    for (let i = 0; i < 20; i++) {
        primaryEventQueue.push({
            at: gameState.getRandomVacantSquare(),
            timestamp: gameState.timestamp,
            unitId: -1,
            action: 'SPAWN_UNIT',
            type: 'dragon',
        });
    }
    io.on('connection', (socket) => {
        rxjs_1.Observable.merge(createObservableFromSocketEvent(socket, 'SPAWN')
            .map(([, respond]) => {
            primaryEventQueue.push({
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
                primaryEventQueue.push({
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
            return createObservableFromSocketEvent(socket, 'MESSAGE')
                .do(([{ unitId, timestamp, action }]) => {
                primaryEventQueue.push({ unitId, action, timestamp });
            });
        })
            .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
            .subscribe();
    });
    // Periodically pull an event from the event queue and apply to game state (Main game loop)
    rxjs_1.Observable.interval(GAMEPLAY_INTERVAL)
        .subscribe(() => {
        // TODO: Handle events with very old timestamp
        if (primaryEventQueue.length === 0)
            return;
        const nextEvent = primaryEventQueue.shift();
        if (nextEvent.timestamp <= gameState.timestamp) {
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
                case 'HEAL': {
                    const location = gameState.getUnitLocation(nextEvent.unitId);
                    if (location) {
                        // Find another player unit clockwise from left at a distance of 2 to heal
                        const nearest = gameState.findNearestUnitOfType(location, 5, 'player');
                        if (nearest) {
                            gameState.healUnit(location, nearest);
                        }
                    }
                    break;
                }
                case 'ATTACK': {
                    const location = gameState.getUnitLocation(nextEvent.unitId);
                    if (location) {
                        // Find another player unit clockwise from left at a distance of 2 to heal
                        const nearest = gameState.findNearestUnitOfType(location, 2, 'dragon');
                        if (nearest) {
                            gameState.attackUnit(location, nearest);
                        }
                    }
                    break;
                }
                case 'PLAYER_ATTACK': {
                    gameState.attackUnit(nextEvent.from, nextEvent.to);
                    break;
                }
                case 'SPAWN_UNIT': {
                    const id = gameState.spawnUnit(nextEvent.type, nextEvent.at);
                    if (nextEvent.respond) {
                        nextEvent.respond(id);
                    }
                    break;
                }
            }
        }
        else {
            console.log('---> Discarding event due to stale timestamp', nextEvent.timestamp, ' ', gameState.timestamp);
        }
    });
    // Periodically broadcast the current game state to all the connected clients
    rxjs_1.Observable.interval(GAMEPLAY_INTERVAL)
        .subscribe(() => {
        io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
    // Dragon attack game event loop
    rxjs_1.Observable.interval(GAMEPLAY_INTERVAL * 25)
        .subscribe(() => {
        // For each dragon, find nearest player and attack
        for (let i = 0; i < gameState.board.length; i++) {
            for (let j = 0; j < gameState.board.length; j++) {
                const unit = gameState.board[i][j];
                if (unit != null && unit.type === 'dragon') {
                    const nearestPlayerLocation = gameState.findNearestUnitOfType([i, j], 2, 'player');
                    if (nearestPlayerLocation) {
                        primaryEventQueue.push({
                            timestamp: gameState.timestamp,
                            unitId: unit.id,
                            action: 'PLAYER_ATTACK',
                            from: [i, j],
                            to: nearestPlayerLocation
                        });
                    }
                }
            }
        }
    });
}
exports.default = socketServer;
