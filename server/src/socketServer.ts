import { Server, Socket } from 'socket.io';
import { GameState, getRandomInt, Square } from './GameState';
import { Observable } from 'rxjs';
import { Observer } from 'rxjs/Observer';

const GAMEPLAY_INTERVAL = 100;

interface ClientMessage {
  timestamp: number,
  action: string,

  [key: string]: any,
}

interface GameEvent {
  timestamp: number,
  unitId: number,
  action: 'HEAL' | 'ATTACK' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'PLAYER_ATTACK' | 'SPAWN_UNIT',
}

interface PlayerAttackEvent extends GameEvent {
  action: 'PLAYER_ATTACK',
  from: Square,
  to: Square,
}

interface SpawnUnitEvent extends GameEvent {
  action: 'SPAWN_UNIT',
  at: Square,
  type: 'player' | 'dragon',
  respond?: Function,
}

const createObservableFromSocketEvent = function createObservableFromSocketEvent(socket: Socket, eventName: string): Observable<[ClientMessage, (Function | null)]> {
  return Observable.create((observer: Observer<any>) => {
    const listener = (...args: any[]) => observer.next(args);
    socket.on(eventName, listener);

    return () => socket.removeListener(eventName, listener);
  });
};

export default function socketServer(io: Server) {
  const gameState = GameState.getInstance();
  const primaryEventQueue: GameEvent[] = [];

  // Initialize the game with 20 dragons
  for (let i = 0; i < 20; i++) {
    primaryEventQueue.push({
      at: gameState.getRandomVacantSquare(),
      timestamp: gameState.timestamp,
      unitId: -1,
      action: 'SPAWN_UNIT',
      type: 'dragon',
    } as SpawnUnitEvent)
  }

  io.on('connection', (socket) => {
    Observable.merge(
      createObservableFromSocketEvent(socket, 'SPAWN')
        .map(([, respond]) => {
          primaryEventQueue.push({
            action: 'SPAWN_UNIT',
            unitId: -1,
            type: 'player',
            timestamp: gameState.timestamp,
            at: gameState.getRandomVacantSquare(),
            respond,
          } as SpawnUnitEvent);
        }),
      createObservableFromSocketEvent(socket, 'RECONNECT')
        .map(([{ id }, respond]) => {
          if (gameState.hasUnit(id)) {
            respond && respond(null);
          } else {
            primaryEventQueue.push({
              action: 'SPAWN_UNIT',
              unitId: -1,
              type: 'player',
              timestamp: gameState.timestamp,
              at: gameState.getRandomVacantSquare(),
              respond,
            } as SpawnUnitEvent)
          }
        })
    )
      .flatMap(() => {
        socket.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });

        return createObservableFromSocketEvent(socket, 'MESSAGE')
          .do(([{ unitId, timestamp, action }]) => {
            primaryEventQueue.push({ unitId, action, timestamp } as GameEvent)
          })
      })
      .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
      .subscribe()
  });

  // Periodically pull an event from the event queue and apply to game state (Main game loop)
  Observable.interval(GAMEPLAY_INTERVAL)
    .subscribe(() => {
      // TODO: Handle events with very old timestamp
      if (primaryEventQueue.length === 0) return;

      const nextEvent = primaryEventQueue.shift()!;

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

  // Periodically broadcast the current game state to all the connected clients
  Observable.interval(GAMEPLAY_INTERVAL)
    .subscribe(() => {
      io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });


  // Dragon attack game event loop
  Observable.interval(GAMEPLAY_INTERVAL * 25)
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
              } as PlayerAttackEvent)
            }
          }
        }
      }
    })
}