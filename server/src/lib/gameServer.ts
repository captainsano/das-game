import { Server } from 'socket.io';
import { Logger } from "./Logger";
import { createStore, applyMiddleware } from 'redux';
import { stateReducer, INIT_STATE, GameState } from './stateReducer';
import { addToQueue, spawnUnit, removeUnit, drainExecuteQueue, attackUnit, healUnit, moveUnit } from './actions';
import { createEpicMiddleware, combineEpics } from 'redux-observable';
import epicFactory from './epic';
import 'rxjs';
import { Observable, Observer } from 'rxjs'

export default function gameServer(io: Server, thisServer: string, mastersList: string[]) {
    const log = Logger.getInstance('GameServer')

    const rootEpic = combineEpics(...epicFactory(io))
    const epicMiddleware = createEpicMiddleware(rootEpic)

    const store = createStore(stateReducer, INIT_STATE, applyMiddleware(epicMiddleware))

    // New client connected
    io.on('connection', (socket) => {
        log.info({socketId: socket.id}, `Connected new socket ${socket.id}`)

        socket.on('SPAWN_UNIT', () => {
            const timestamp = (store.getState() || {timestamp: 0}).timestamp
            store.dispatch(addToQueue(timestamp, spawnUnit(socket.id, 'KNIGHT')))
        })

        socket.on('MESSAGE', ({ unitId, action, timestamp }) => {
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
            const timestamp = (store.getState() || {timestamp: 0}).timestamp
            store.dispatch(addToQueue(timestamp, removeUnit(socket.id)))
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
    .distinctUntilChanged()
    .subscribe((state) => { 
        io.sockets.emit('STATE_UPDATE', {
            timestamp: state.timestamp,
            board: state.board
        })
    })
}