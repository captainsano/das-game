import { Server, Socket } from 'socket.io';
import { GameState } from './GameState';
import { Observable } from 'rxjs';
import { Observer } from 'rxjs/Observer';

interface ClientMessage {
  action: string,
  payload: object,

  [key: string]: any,
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

  io.on('connection', (socket) => {
    console.log('---> Got connection from ', socket.id);

    Observable.merge(
      createObservableFromSocketEvent(socket, 'SPAWN')
        .do(([, respond]) => {
          const newUnitId = gameState.spawnUnit();
          respond && respond(newUnitId);
        }),
      createObservableFromSocketEvent(socket, 'RECONNECT')
        .do(([{ id }, respond]) => {
          if (gameState.hasUnit(id)) {
            respond && respond(null);
          } else {
            const newId = gameState.spawnUnit();
            respond && respond(newId);
          }
        })
    )
      .flatMap(() => {
        return Observable.empty();
      })
      .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
      .subscribe()
  });

  // Periodically broadcast the current game state to all the connected clients
  Observable
    .interval()
    .delay(1000)
    .subscribe(() => {
      io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}