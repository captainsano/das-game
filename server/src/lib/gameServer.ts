import { Server } from 'socket.io';
import { Logger } from "./Logger";
import { values, find } from 'ramda'
import { createStore, applyMiddleware } from 'redux';
import { stateReducer, INIT_STATE, GameState } from './stateReducer';
import { addToQueue, spawnUnit, removeUnit, drainExecuteQueue, attackUnit, healUnit, moveUnit } from './actions';
import { createEpicMiddleware, combineEpics } from 'redux-observable';
import epicFactory from './epic';
import 'rxjs';
import { Observable, Observer, BehaviorSubject } from 'rxjs'
import { DRAGONS_COUNT } from './util';

export default function gameServer(io: Server, thisServer: string, mastersList: string[]) {
    const log = Logger.getInstance('GameServer')

    const rootEpic = combineEpics(...epicFactory(io))
    const epicMiddleware = createEpicMiddleware(rootEpic)

    const store = createStore(stateReducer, INIT_STATE, applyMiddleware(epicMiddleware))

    // Subject to capture all events occurring in all the sockets with a delay of 250ms
    const globalSocketEvents = new BehaviorSubject<[string, object]>(['', {}])

    // Core socket handler
    io.on('connection', (socket) => {
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

    Observable
        .interval(1000)
        .subscribe(() => {
            const state = store.getState()
            if (state != null && state.executionQueue.length > 0) {
                // TODO: Handle out of order timestamps and replays
                state.executionQueue.forEach((a) => store.dispatch(a))
                store.dispatch(drainExecuteQueue())
            }
        })

    Observable.create((o: Observer<GameState>) => {
        store.subscribe(() => {
            const state = store.getState()
            if (state != null) { o.next(state) }
        })
    })
    .bufferTime(1000)
    .subscribe((states: GameState[]) => { 
        if (states.length > 0) {
            io.sockets.emit('STATE_UPDATE', {
                timestamp: states[states.length - 1].timestamp,
                board: states[states.length - 1].board
            })
        }
    })

    Observable
        .interval(1000)
        .take(1)
        .subscribe(() => {
            const state = store.getState()
            if (state != null) {
                for (let i = 0; i < DRAGONS_COUNT; i++) {
                    store.dispatch(addToQueue(state.timestamp, spawnUnit(`dragon-${i}`, 'DRAGON')))
                }
            }
        })
}