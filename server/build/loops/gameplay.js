"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const Types_1 = require("../Types");
const GameState_1 = require("../GameState");
function gameplay(getNextEvent) {
    const gameState = GameState_1.GameState.getInstance();
    const replaySet = [];
    // Periodically pull an event from the event queue and apply to game state (Main game loop)
    Observable_1.Observable.interval(Types_1.GAMEPLAY_INTERVAL)
        .subscribe(() => {
        const nextEvent = getNextEvent();
        if (!nextEvent)
            return;
        if (gameState.timestamp - nextEvent.timestamp <= 250) {
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
            // replaySet.push({ timestamp: gameState.timestamp, board: [...gameState.board] })
        }
        else {
            console.log('---> Discarding event due to stale timestamp', nextEvent.timestamp, ' ', gameState.timestamp);
        }
    });
}
exports.gameplay = gameplay;
