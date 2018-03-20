import { Observable } from 'rxjs';
import { GameState } from '../GameState';
import { GameEvent, GAMEPLAY_INTERVAL, PlayerAttackEvent } from "../Types";

export function dragonAttack(isMaster: () => boolean, addToPrimaryQueue: (event: GameEvent) => void) {
  const gameState = GameState.getInstance();

  // Dragon attack game event loop
  Observable.interval(GAMEPLAY_INTERVAL * 25)
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
              } as PlayerAttackEvent)
            }
          }
        }
      }
    })
}
