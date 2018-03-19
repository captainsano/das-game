import { Server, Socket } from 'socket.io';
import { GameState } from './GameState';
import { Observable } from 'rxjs';
import { Observer } from 'rxjs/Observer';

interface ClientMessage {
  timestamp: number,
  action: string,

  [key: string]: any,
}

interface GameEvent {
  timestamp: number,
  unitId: number,
  action: 'HEAL' | 'DAMAGE' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN',
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

  io.on('connection', (socket) => {
    console.log('---> Got connection from ', socket.id);

    Observable.merge(
      createObservableFromSocketEvent(socket, 'SPAWN')
        .map(([, respond]) => {
          const newUnitId = gameState.spawnUnit();
          respond && respond(newUnitId);
          return newUnitId;
        }),
      createObservableFromSocketEvent(socket, 'RECONNECT')
        .map(([{ id }, respond]) => {
          if (gameState.hasUnit(id)) {
            respond && respond(null);
            return id;
          }
          const newUnitId = gameState.spawnUnit();
          respond && respond(newUnitId);
          return newUnitId;
        })
    )
      .flatMap((unitId) => {
        socket.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });

        return createObservableFromSocketEvent(socket, 'MESSAGE')
          .do(([{ timestamp, action }]) => {
            primaryEventQueue.push({
              unitId,
              action,
              timestamp,
            } as GameEvent)
          })
      })
      .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
      .subscribe()
  });

  // Periodically pull an event from the event queue and apply to game state
  Observable.interval(50)
    .subscribe(() => {
      // TODO: Handle events with very old timestamp
      if (primaryEventQueue.length === 0) return;

      const nextEvent = primaryEventQueue.shift()!;

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
  Observable.interval(100)
    .map(() => gameState.board.toString())
    .distinctUntilChanged()
    .subscribe(() => {
      io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}