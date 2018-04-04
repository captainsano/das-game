"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Observable_1 = require("rxjs/Observable");
const Types_1 = require("../Types");
const GameState_1 = require("../GameState");
const ramda_1 = require("ramda");
const Logger_1 = require("../Logger");
const log = Logger_1.Logger.getInstance('GamePlay');
const executeEvent = function executeEvent(nextEvent) {
    const gameState = GameState_1.GameState.getInstance();
    log.info({ event: nextEvent, atTimestamp: gameState.timestamp }, `Executing event ${nextEvent.action} ${nextEvent.unitId}`);
    switch (nextEvent.action) {
        case 'UP': {
            const location = gameState.getUnitLocation(nextEvent.unitId);
            if (location) {
                return gameState.moveUnit([location[0], location[1]], [location[0], location[1] - 1]);
            }
            break;
        }
        case 'DOWN': {
            const location = gameState.getUnitLocation(nextEvent.unitId);
            if (location) {
                return gameState.moveUnit([location[0], location[1]], [location[0], location[1] + 1]);
            }
            break;
        }
        case 'RIGHT': {
            const location = gameState.getUnitLocation(nextEvent.unitId);
            if (location) {
                return gameState.moveUnit([location[0], location[1]], [location[0] + 1, location[1]]);
            }
            break;
        }
        case 'LEFT': {
            const location = gameState.getUnitLocation(nextEvent.unitId);
            if (location) {
                return gameState.moveUnit([location[0], location[1]], [location[0] - 1, location[1]]);
            }
            break;
        }
        case 'HEAL': {
            const location = gameState.getUnitLocation(nextEvent.unitId);
            if (location) {
                // Find another player unit clockwise from left at a distance of 2 to heal
                const nearest = gameState.findNearestUnitOfType(location, 5, 'player');
                if (nearest) {
                    return gameState.healUnit(location, nearest);
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
                    return gameState.attackUnit(location, nearest);
                }
            }
            break;
        }
        case 'PLAYER_ATTACK': {
            return gameState.attackUnit(nextEvent.from, nextEvent.to);
        }
        case 'SPAWN_UNIT': {
            const id = gameState.spawnUnit(nextEvent.type, nextEvent.at);
            if (nextEvent.respond) {
                nextEvent.respond(id);
            }
            return true;
        }
        case 'REMOVE_UNIT': {
            return gameState.removeUnit(nextEvent.unitId);
        }
    }
    return false;
};
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
            const prevTimestamp = gameState.timestamp;
            const prevBoard = ramda_1.clone(gameState.board);
            executeEvent(nextEvent);
            replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent: ramda_1.clone(nextEvent) });
        }
        else if (gameState.timestamp - nextEvent.timestamp <= 500) {
            gameState.replaying = true;
            log.info({ eventTimestamp: nextEvent.timestamp, currentTimestamp: gameState.timestamp }, 'Replaying due to stale timestamp');
            const currentBoard = ramda_1.clone(gameState.board);
            // Put next event in the appropriate place and start execution
            const eventsToExecute = replaySet.filter((e) => e.timestamp >= nextEvent.timestamp);
            if (eventsToExecute.length > 0) {
                const firstState = eventsToExecute[0];
                gameState.setState(firstState.board, firstState.timestamp);
                replaySet.length = 0; // Clear the existing replay set
                // Execution leading to new states
                let prevTimestamp = gameState.timestamp;
                let prevBoard = ramda_1.clone(gameState.board);
                executeEvent(nextEvent);
                replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent });
                // Replay other actions
                let successfulExecutions = 0;
                eventsToExecute.forEach((e) => {
                    prevTimestamp = gameState.timestamp;
                    prevBoard = ramda_1.clone(gameState.board);
                    if (executeEvent(e.nextEvent)) {
                        successfulExecutions += 1;
                    }
                    replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent: e.nextEvent });
                });
                const newBoard = ramda_1.clone(gameState.board);
                // Log the replay summary
                let diff = 0;
                for (let i = 0; i < newBoard.length; i++) {
                    for (let j = 0; j < newBoard.length; j++) {
                        if ((currentBoard[i][j] ? currentBoard[i][j].type : 'X') !== (newBoard[i][j] ? newBoard[i][j].type : 'X')) {
                            diff += 1;
                        }
                    }
                }
                log.info({ replayedEvents: eventsToExecute.length, currentTimestamp: gameState.timestamp, diffSquares: diff }, 'Done replaying events');
            }
            else {
                log.info('Sufficient replay state not found to rollback. Making best effort execution');
                const prevTimestamp = gameState.timestamp;
                const prevBoard = ramda_1.clone(gameState.board);
                executeEvent(nextEvent);
                replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent: ramda_1.clone(nextEvent) });
            }
            gameState.replaying = false;
        }
    });
}
exports.gameplay = gameplay;
//# sourceMappingURL=gameplay.js.map