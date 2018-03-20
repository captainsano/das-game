import { Server, Socket } from 'socket.io';
import { ClientMessage, GameEvent, GAMEPLAY_INTERVAL, SpawnUnitEvent } from './Types';
import { GameState } from './GameState';
import { Observable } from 'rxjs';
import { Observer } from 'rxjs/Observer';
import { gameplay } from "./loops/gameplay";
import { dragonAttack } from "./loops/dragonAttack";

const createObservableFromSocketEvent = function createObservableFromSocketEvent(socket: Socket, eventName: string): Observable<[ClientMessage, (Function | null)]> {
  return Observable.create((observer: Observer<any>) => {
    const listener = (...args: any[]) => observer.next(args);
    socket.on(eventName, listener);

    return () => socket.removeListener(eventName, listener);
  });
};

export default function socketServer(io: Server, thisProcess: string, mastersList: string[]) {
  let currentMasterList = [...mastersList];
  let masterLive = false;
  let isMaster = false;

  // Try establishing connection to master
  const gameState = GameState.getInstance();
  const primaryEventQueue: GameEvent[] = [];
  const forwardEventQueue: GameEvent[] = [];

  // Initialize the game with 20 dragons
  const initializeDragons = () => {
    for (let i = 0; i < 20; i++) {
      primaryEventQueue.push({
        at: gameState.getRandomVacantSquare(),
        timestamp: gameState.timestamp,
        unitId: -1,
        action: 'SPAWN_UNIT',
        type: 'dragon',
      } as SpawnUnitEvent)
    }
  };

  // Handle connection to master
  if (thisProcess === mastersList[0]) {
    isMaster = true;
    initializeDragons();
  } else {
    isMaster = false;

    // Drain things in primaryEventQueue and put it in forward queue
    let e = primaryEventQueue.shift();
    while (e != null) {
      forwardEventQueue.push(e);
    }
  }

  // Handle client connection (new and reconnection)
  io.on('connection', (socket) => {
    Observable.merge(
      createObservableFromSocketEvent(socket, 'SPAWN')
        .map(([, respond]) => {
          (isMaster ? primaryEventQueue : forwardEventQueue).push({
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
            (isMaster ? primaryEventQueue : forwardEventQueue).push({
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

        // Listen to messages from client
        return createObservableFromSocketEvent(socket, 'MESSAGE')
          .do(([{ unitId, timestamp, action }]) => {
            // Process events if master, else forward
            if (isMaster) {
              primaryEventQueue.push({ unitId, action, timestamp } as GameEvent)
            } else {
              forwardEventQueue.push({ unitId, action, timestamp } as GameEvent)
            }
          })
      })
      .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
      .subscribe()
  });

// Periodically pull events from the primaryQueue and process
  gameplay(() => primaryEventQueue.shift()!);

// Periodically pull events from forwardEventQueue and forward
// TODO:

// AI gameplay (if current master)
  dragonAttack(() => isMaster, (e) => primaryEventQueue.push(e))

// Periodically broadcast the current game state to all the connected clients
  Observable.interval(GAMEPLAY_INTERVAL * 100)
    .subscribe(() => {
      io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}