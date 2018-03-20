import { Server, Socket } from 'socket.io';
import { Board, ClientMessage, GameEvent, GAMEPLAY_INTERVAL, SpawnUnitEvent } from './Types';
import { GameState } from './GameState';
import { Observable } from 'rxjs';
import { Observer } from 'rxjs/Observer';
import { gameplay } from "./loops/gameplay";
import { dragonAttack } from "./loops/dragonAttack";
import axios from 'axios';
import * as clientSocket from 'socket.io-client'

const createObservableFromSocketEvent = function createObservableFromSocketEvent(socket: Socket, eventName: string): Observable<[ClientMessage, (Function | null)]> {
  return Observable.create((observer: Observer<any>) => {
    const listener = (...args: any[]) => observer.next(args);
    socket.on(eventName, listener);

    return () => socket.removeListener(eventName, listener);
  });
};

export default async function socketServer(io: Server, thisProcess: string, mastersList: string[]) {
  let currentMasterList = [...mastersList];
  let isMaster = false;

  // Try establishing connection to master
  const gameState = GameState.getInstance();
  const primaryEventQueue: GameEvent[] = [];
  const forwardEventQueue: GameEvent[] = [];
  let currentMaster = '';

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
  if (thisProcess === currentMasterList[0]) {
    isMaster = true;
    initializeDragons();
  } else {
    isMaster = false;

    // Drain things in primaryEventQueue and put it in forward queue
    let e = primaryEventQueue.shift();
    while (e != null) {
      forwardEventQueue.push(e);
    }

    // ---- Establish socket connection to master ----
    // Determine if master is available
    const forwardLoop = () => {
      if (currentMasterList.length > 0) {
        const server = currentMasterList.shift()!;
        currentMaster = server;

        if (server === thisProcess) {
          isMaster = true;
          // Take any item pending in forward queue and put it in primary queue
          let m = forwardEventQueue.shift();
          while (m) {
            primaryEventQueue.push(m);
            m = forwardEventQueue.shift();
          }
          return;
        }

        isMaster = false;
        console.log(`Evaluating: ${server}`)

        return Observable
          .interval(1000)
          .startWith(0)
          .concatMap(async () => {
            // Check if master is live
            const ATTEMPTS = 3;
            for (let i = 0; i < ATTEMPTS; i++) {
              try {
                const result = await axios.get(`http://${server}/health`);
                if (result.status === 200) {
                  return server
                }
              } catch (e) { }
            }
            return ''
          })
          .distinctUntilChanged()
          .do((server) => {
            if (!isMaster && server) {
              const s = clientSocket.connect(`http://${server}`);
              s.on('STATE_UPDATE', ({ board, timestamp }: { board: Board, timestamp: number }) => {
                // console.log('--> Got state update from server');
                gameState.setState(board, timestamp);
              });

              // Periodically forward events
              return Observable
                .interval(GAMEPLAY_INTERVAL)
                .filter(() => currentMaster === server)
                .subscribe(() => {
                  if (s.connected) {
                    // console.log('Forwarding to server: ', server);
                    const m = forwardEventQueue.shift();
                    if (m) { s.emit('FORWARD', m) }
                  }
                })
            } else if (!server) {
              console.log('---> Running forward loop again');
              console.log(currentMasterList);
              forwardLoop();
            }

            return Observable.empty()
          })
          .subscribe()
      } else {
        console.log('---> No servers exist!');
        process.exit(0);
      }

    };

    forwardLoop()
  }

  // Handle client connection (new and reconnection)
  io.on('connection', (socket) => {
    // Connection from other servers
    createObservableFromSocketEvent(socket, 'FORWARD')
      .filter(() => isMaster)
      .do(([e]) => {
        // console.log('--> Got an event from another server');
        primaryEventQueue.push(e as GameEvent)
      })
      .takeUntil(createObservableFromSocketEvent(socket, 'disconnect'))
      .subscribe()

    // Connection from clients
    Observable.merge(
      createObservableFromSocketEvent(socket, 'SPAWN')
        .map(([, respond]) => {
          (isMaster ? primaryEventQueue : forwardEventQueue).push({
            action: 'SPAWN_UNIT',

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

  // AI gameplay (if current master)
  dragonAttack(() => isMaster, (e) => primaryEventQueue.push(e));

  // Periodically broadcast the current game state to all the connected clients
  Observable.interval(GAMEPLAY_INTERVAL * 100)
    .subscribe(() => {
      io.sockets.emit('STATE_UPDATE', { board: gameState.board, timestamp: gameState.timestamp });
    });
}