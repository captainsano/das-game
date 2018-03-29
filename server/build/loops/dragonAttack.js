"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const GameState_1 = require("../GameState");
const Types_1 = require("../Types");
function dragonAttack(isMaster, addToPrimaryQueue) {
    const gameState = GameState_1.GameState.getInstance();
    // Dragon attack game event loop
    rxjs_1.Observable.interval(Types_1.GAMEPLAY_INTERVAL * 1000)
        .filter(() => isMaster())
        .subscribe(() => {
        // For each dragon, find nearest player and attack
        for (let i = 0; i < gameState.board.length; i++) {
            for (let j = 0; j < gameState.board.length; j++) {
                const unit = gameState.board[i][j];
                if (unit != null && unit.type === 'dragon') {
                    const nearestPlayerLocation = gameState.findNearestUnitOfType([i, j], 2, 'player');
                    if (nearestPlayerLocation) {
                        addToPrimaryQueue({
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
exports.dragonAttack = dragonAttack;
//# sourceMappingURL=dragonAttack.js.map