import { Observable } from 'rxjs/Observable';
import { GameEvent, GAMEPLAY_INTERVAL, PlayerAttackEvent, SpawnUnitEvent } from "../Types";
import { GameState } from '../GameState'

export function gameplay(getNextEvent: () => GameEvent | null) {
  const gameState = GameState.getInstance();

  // Periodically pull an event from the event queue and apply to game state (Main game loop)
  Observable.interval(GAMEPLAY_INTERVAL)
    .subscribe(() => {
      const nextEvent = getNextEvent();
      if (!nextEvent) return;

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
            gameState.attackUnit((nextEvent as PlayerAttackEvent).from, (nextEvent as PlayerAttackEvent).to);
            break;
          }

          case 'SPAWN_UNIT': {
            const id = gameState.spawnUnit((nextEvent as SpawnUnitEvent).type, (nextEvent as SpawnUnitEvent).at);
            if ((nextEvent as SpawnUnitEvent).respond) {
              (nextEvent as SpawnUnitEvent).respond!(id);
            }
            break;
          }
        }
      } else {
        console.log('---> Discarding event due to stale timestamp', nextEvent.timestamp, ' ', gameState.timestamp);
      }
    });
}