import { Observable } from 'rxjs/Observable';
import { GameEvent, GAMEPLAY_INTERVAL, PlayerAttackEvent, SpawnUnitEvent, Board } from "../Types";
import { GameState } from '../GameState'
import { clone } from 'ramda'
import { Logger } from '../Logger';

const log = Logger.getInstance('GamePlay')

interface StateSnapshot {
  timestamp: number,
  board: Board,
  nextEvent: GameEvent,
}

const executeEvent = function executeEvent(nextEvent: GameEvent) {
  const gameState = GameState.getInstance();
  log.info({ event: nextEvent, atTimestamp: gameState.timestamp }, `Executing event ${nextEvent.action} ${nextEvent.unitId}`)

  switch (nextEvent.action) {
    case 'UP': {
      const location = gameState.getUnitLocation(nextEvent.unitId);
      if (location) {
        return gameState.moveUnit([location[0], location[1]], [location[0], location[1] - 1]);
      }
      break
    }

    case 'DOWN': {
      const location = gameState.getUnitLocation(nextEvent.unitId);
      if (location) {
        return gameState.moveUnit([location[0], location[1]], [location[0], location[1] + 1]);
      }
      break
    }

    case 'RIGHT': {
      const location = gameState.getUnitLocation(nextEvent.unitId);
      if (location) {
        return gameState.moveUnit([location[0], location[1]], [location[0] + 1, location[1]]);
      }
      break
    }

    case 'LEFT': {
      const location = gameState.getUnitLocation(nextEvent.unitId);
      if (location) {
        return gameState.moveUnit([location[0], location[1]], [location[0] - 1, location[1]]);
      }
      break
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
      break
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
      break
    }

    case 'PLAYER_ATTACK': {
      return gameState.attackUnit((nextEvent as PlayerAttackEvent).from, (nextEvent as PlayerAttackEvent).to);
    }

    case 'SPAWN_UNIT': {
      const id = gameState.spawnUnit((nextEvent as SpawnUnitEvent).type, (nextEvent as SpawnUnitEvent).at);
      if ((nextEvent as SpawnUnitEvent).respond) {
        (nextEvent as SpawnUnitEvent).respond!(id);
      }
      break
    }

    case 'REMOVE_UNIT': {
      return gameState.removeUnit(nextEvent.unitId)
    }
  }

  return false
}

export function gameplay(getNextEvent: () => GameEvent | null) {
  const gameState = GameState.getInstance();
  const replaySet = [] as StateSnapshot[]

  // Periodically pull an event from the event queue and apply to game state (Main game loop)
  Observable.interval(GAMEPLAY_INTERVAL)
    .subscribe(() => {
      const nextEvent = getNextEvent();
      if (!nextEvent) return;

      if (gameState.timestamp - nextEvent.timestamp <= 25) {
        const prevTimestamp = gameState.timestamp
        const prevBoard = clone(gameState.board) 
        executeEvent(nextEvent)
        replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent: clone(nextEvent) })
      } else {
        log.info({eventTimestamp: nextEvent.timestamp, currentTimestamp: gameState.timestamp}, 'Replaying due to stale timestamp');
        const currentBoard = clone(gameState.board)

        // Put next event in the appropriate place and start execution
        const eventsToExecute = replaySet.filter((e) => e.timestamp >= nextEvent.timestamp)
        if (eventsToExecute.length > 0) {
          const firstState = eventsToExecute[0]
          gameState.setState(firstState.board, firstState.timestamp)

          replaySet.length = 0 // Clear the existing replay set
          // Execution leading to new states
          let prevTimestamp = gameState.timestamp
          let prevBoard = clone(gameState.board)
          executeEvent(nextEvent)
          replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent })

          // Replay other actions
          let successfulExecutions = 0
          eventsToExecute.forEach((e) => {
            prevTimestamp = gameState.timestamp
            prevBoard = clone(gameState.board)
            if (executeEvent(e.nextEvent)) {
              successfulExecutions += 1
            }
            replaySet.push({ timestamp: prevTimestamp, board: prevBoard, nextEvent })
          })

          const newBoard = clone(gameState.board)

          // Log the replay summary
          let diff = 0
          for (let i = 0; i < newBoard.length; i++) {
            for (let j = 0; j < newBoard.length; j++) {
              if ((currentBoard[i][j] ? currentBoard[i][j]!.type : 'X') !== (newBoard[i][j] ? newBoard[i][j]!.type : 'Y'))  { 
                diff += 1
              }  
            }
          }

          log.info({replayedEvents: eventsToExecute.length, currentTimestamp: gameState.timestamp, diffSquares: diff}, 'Done replaying events');
        }
      }
    });
}