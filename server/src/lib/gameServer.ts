import 'rxjs'
import { Server, Socket } from 'socket.io'
import * as SocketIOClient from 'socket.io-client'
import { Logger } from './Logger'
import { values, find, drop, sortBy } from 'ramda'
import { createStore, applyMiddleware } from 'redux'
import { stateReducer, INIT_STATE, GameState } from './stateReducer'
import { addToQueue, spawnUnit, removeUnit, drainExecuteQueue, attackUnit, healUnit, moveUnit, setSyncState, ExecutionAction, GameAction, addToForwardQueue, drainForwardQueue, masterServerSync } from './actions'
import { createEpicMiddleware, combineEpics } from 'redux-observable'
import epicFactory from './epic'
import { Observable, Observer, BehaviorSubject } from 'rxjs'
import { DRAGONS_COUNT } from './util'
import dragonsAttack from './dragonsAttack';

export default function gameServer(gameIo: Server, syncIo: Server, thisServer: string, mastersList: string[]) {
    const log = Logger.getInstance('GameServer')

    const rootEpic = combineEpics(...epicFactory(gameIo, syncIo))
    const epicMiddleware = createEpicMiddleware(rootEpic)

    const store = createStore(stateReducer, INIT_STATE, applyMiddleware(epicMiddleware))

    // Subject to capture all events occurring in all the sockets with a delay of 250ms
    const globalSocketEvents = new BehaviorSubject<[string, object]>(['', {}])

    // Core socket handler for the games
    gameIo.on('connection', (socket) => {
        log.info({socketId: socket.id}, `Connection`)
        globalSocketEvents.next(['connection', {socketId: socket.id}])

        socket.on('SPAWN_UNIT', () => {
            globalSocketEvents.next(['SPAWN_UNIT', {socketId: socket.id}])
            const timestamp = (store.getState() || {timestamp: 0}).timestamp
            store.dispatch(addToQueue(timestamp, spawnUnit(socket.id, 'KNIGHT')))
        })

        socket.on('RECONNECT', ({ timestamp, unitId }) => {
            globalSocketEvents.next(['RECONNECT', {socketId: socket.id, timestamp, unitId}])

            const state = store.getState()
            if (state) {
                const foundUnitId = find((id) => id === unitId, values(state.socketIdToUnitId))
                if (!foundUnitId) {
                    store.dispatch(addToQueue(timestamp, spawnUnit(socket.id, 'KNIGHT')))
                } else {
                    socket.emit('STATE_UPDATE', {
                        timestamp: store.getState()!.timestamp,
                        board: store.getState()!.board
                    })
                }
            }
        })

        socket.on('MESSAGE', ({ unitId, action, timestamp }) => {
            globalSocketEvents.next(['MESSAGE', {socketId: socket.id, unitId, action, timestamp}])
            switch (action) {
                case 'ATTACK':
                    store.dispatch(addToQueue(timestamp, attackUnit(unitId)))
                    break;
                case 'HEAL':
                    store.dispatch(addToQueue(timestamp, healUnit(unitId)))
                    break;
                case 'LEFT':
                    store.dispatch(addToQueue(timestamp, moveUnit(unitId, 'LEFT')))
                    break;
                case 'UP':
                    store.dispatch(addToQueue(timestamp, moveUnit(unitId, 'UP')))
                    break;
                case 'RIGHT':
                    store.dispatch(addToQueue(timestamp, moveUnit(unitId, 'RIGHT')))
                    break;
                case 'DOWN':
                    store.dispatch(addToQueue(timestamp, moveUnit(unitId, 'DOWN')))
                    break;
            }
        })

        socket.on('disconnect', () => {
            log.info({socketId: socket.id}, `Disconnect`)
            globalSocketEvents.next(['disconnect', {socketId: socket.id}])

            const state = store.getState()
            const socketId = socket.id

            if (state) {
                const unitId = state.socketIdToUnitId[socket.id]
                if (unitId) {
                    Observable.of(0)
                        .delay(10000)
                        .takeUntil(globalSocketEvents.filter((event: [string, {unitId: number}]) => event[0] === 'RECONNECT' && event[1].unitId === unitId))
                        .subscribe(() => store.dispatch(addToQueue(store.getState()!.timestamp, removeUnit(socketId))))
                }
            }
        })
    })

    // Game execution and forward queue management
    Observable
        .interval(1000)
        .filter(() => store.getState() !== null && !store.getState()!.connecting)
        .filter(() => store.getState() !== null && store.getState()!.isMaster)
        .do((val) => { 
            if ((val * 1000) % 5000 === 0)  {
                log.info('Dragons attack')
                dragonsAttack(store) 
            }
        })
        .subscribe(() => {
            const state = store.getState()
            if (state != null && state.executionQueue.length > 0) {
                if (state.isMaster) {
                    // TODO: Handle out of order timestamps and replays
                    
                    if (state.executionQueue.length > 0) {
                        // If the action is in the execution queue
                        const sortedExecutionQueue = sortBy((e: GameAction) => e.timestamp!, state.executionQueue)
                        const firstTimestamp = sortedExecutionQueue[0].timestamp!

                        if (firstTimestamp < state.timestamp) {
                            log.fatal(`Need to replay events from ${firstTimestamp}`)
                            // Find the board state at firstTimestamp - 1
                        } else {
                            sortedExecutionQueue.forEach((a) => store.dispatch(a))
                            store.dispatch(drainExecuteQueue())
                        }
                    }
                } else {
                    state.executionQueue.forEach((a: GameAction) => store.dispatch(addToForwardQueue(a.timestamp!, a)))
                    store.dispatch(drainExecuteQueue())
                }
            }
        })

    // Forward execution queue to master server
    Observable
        .interval(1000)
        .filter(() => store.getState() !== null && !store.getState()!.connecting)
        .filter(() => store.getState() !== null && !store.getState()!.isMaster && store.getState()!.masterSocket != null)
        .subscribe(() => { 
            const state = store.getState()
            if (state != null && state.forwardQueue.length > 0) {
                // TODO: Handle special actions such as forward
                state.forwardQueue.forEach((a: GameAction) => {
                    log.info({timestamp: a.timestamp, action: a }, 'Forwarding')
                    state.masterSocket!.emit('FORWARD', { timestamp: a.timestamp, action: a })
                })
                store.dispatch(drainForwardQueue())
            }
        })
    
    // Broadcast game updates to clients, buffered by every 1second
    Observable.create((o: Observer<GameState>) => {
        store.subscribe(() => {
            const state = store.getState()
            if (state != null) { o.next(state) }
        })
    })
    .bufferTime(1000)
    .do((states: GameState[]) => { 
        if (states.length > 0) {
            gameIo.sockets.emit('STATE_UPDATE', {
                timestamp: states[states.length - 1].timestamp,
                board: states[states.length - 1].board
            })
        }
    })
    .do((states: GameState[]) => {
        if (states.length > 0) {
            syncIo.sockets.emit('SYNC', {
                timestamp: states[states.length - 1].timestamp,
                board: states[states.length - 1].board,
                socketIdToUnitId: states[states.length - 1].socketIdToUnitId
            })
        }
    })
    .subscribe()

    // Dragon Spawn actions on game start
    Observable
        .interval(1000)
        .delay(2500)
        .take(1)
        .filter(() => store.getState() !== null && !store.getState()!.connecting)
        .filter(() => store.getState() !== null && store.getState()!.isMaster)
        .subscribe(() => {
            const state = store.getState()
            if (state != null) {
                for (let i = 0; i < DRAGONS_COUNT; i++) {
                    store.dispatch(addToQueue(state.timestamp, spawnUnit(`dragon-${i}`, 'DRAGON')))
                }
            }
        })

    // --------------- MATINTAINING CONNECTION TO MASTER / BECOMING MASTER -----------------
    const findMaster = function findMaster(thisProcess: string, mastersList: string[], retryCount = 1) {
        if (mastersList.length === 0) {
            log.fatal('Masters list is empty')
            process.exit(-1)
        } else if (thisProcess === mastersList[0]) {
            log.info('Becoming Master')
            store.dispatch(setSyncState(false, true))

            syncIo.on('connection', (socket) => {
                log.info('Got connection from another server')

                socket.on('FORWARD', ({ timestamp, gameAction }) => {
                    if (!timestamp || !gameAction) { }
                    else store.dispatch(addToQueue(timestamp, gameAction))
                })

                socket.on('disconnect', () => {
                    log.info('A slave server disconnected')
                })
            })
        } else {
            const nextMaster = mastersList[0]

            log.info({master: nextMaster, attemp: retryCount}, 'Connecting to master')

            // Attempt connection to a master
            const io = SocketIOClient(`http://${nextMaster}`, { reconnection: false })
            const connectionTimeout = setTimeout(() => {
                if (io.connected) return;
                if (retryCount < 3) {
                    findMaster(thisProcess, mastersList, retryCount + 1)
                } else {
                    findMaster(thisProcess, drop(1, mastersList))
                }
            }, 2500)

            io.on('connect', () => {
                log.info({master: nextMaster}, 'Connection made to master')
                store.dispatch(setSyncState(false, false, io))

                io.on('SYNC', ({ timestamp, board, socketIdToUnitId }) => {
                    store.dispatch(masterServerSync(timestamp, board, socketIdToUnitId))
                })

                io.on('ASSIGN_UNIT_ID', ({ socketId, unitId }) => {
                    if (gameIo.sockets.connected[socketId]) {
                        gameIo.sockets.connected[socketId].emit('ASSIGN_UNIT_ID', unitId)
                    }
                })
            })

            io.on('disconnect', () => {
                log.info({master: nextMaster}, 'Disconnected from master')
                store.dispatch(setSyncState(true, false))

                // Retry three times
                setTimeout(() => {
                    if (!io.connected && retryCount < 3) {
                        findMaster(thisProcess, mastersList, retryCount + 1)
                    } else {
                        findMaster(thisProcess, drop(1, mastersList))
                    }
                }, 1000 + (10 * mastersList.length))
            })
        }
    }

    findMaster(thisServer, mastersList)
}