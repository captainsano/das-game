import { Server } from 'socket.io';
import { Logger } from "./Logger";
import { createStore, applyMiddleware } from 'redux';
import { stateReducer, INIT_STATE, GameState } from './stateReducer';
import { addToQueue, spawnUnit, removeUnit, execute } from './actions';
import { createEpicMiddleware } from 'redux-observable';
import { loggerEpic } from './epic';
import 'rxjs';
import { Observable, Observer } from 'rxjs'

export default function gameServer(io: Server, thisServer: string, mastersList: string[]) {
    const log = Logger.getInstance('GameServer')

    const epicMiddleware = createEpicMiddleware(loggerEpic)
    const store = createStore(stateReducer, INIT_STATE, applyMiddleware(epicMiddleware))

    // New client connected
    io.on('connection', (socket) => {
        log.info({socketId: socket.id}, `Connected new socket ${socket.id}`)

        socket.on('SPAWN_UNIT', () => {
            const timestamp = (store.getState() || {timestamp: 0}).timestamp
            store.dispatch(addToQueue(timestamp, spawnUnit(socket.id, 'KNIGHT')))
        })

        socket.on('MESSAGE', (message) => {
            const timestamp = (store.getState() || {timestamp: 0}).timestamp
            store.dispatch(addToQueue(timestamp, removeUnit(socket.id)))
        })

        socket.on('disconnect', () => {
            const timestamp = (store.getState() || {timestamp: 0}).timestamp
            store.dispatch(addToQueue(timestamp, removeUnit(socket.id)))
        })
    })

    Observable
        .interval(1000)
        .delay(5000)
        .subscribe(() => store.dispatch(execute()))

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