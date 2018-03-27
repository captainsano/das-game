import 'rxjs'
import { GameAction, ExecutionAction, SpawnUnitAction } from './actions'
import { Observable } from 'rxjs'
import { Store, AnyAction } from 'redux'
import { GameState } from './stateReducer'
import { ActionsObservable } from 'redux-observable'
import { Logger } from './Logger'
import { Server } from 'socket.io'
import { dissocPath } from 'ramda'

const log = Logger.getInstance('LoggerEpic')

export default function epicFactory(gameIo: Server, syncIo: Server) {
    return [
        function loggerEpic(action$: ActionsObservable<GameAction | ExecutionAction>, store: Store<GameState>): Observable<GameAction | ExecutionAction> {
            return action$
                // .do((action) => log.info({...dissocPath(['payload', 'board'], dissocPath(['payload', 'masterSocket'], action)), executedAtTimestamp: store.getState().timestamp}))
                .flatMapTo(Observable.empty())
        },
        function spawnUnitResponderEpic(action$: ActionsObservable<GameAction>, store: Store<GameState>): Observable<GameAction> {
            return action$.ofType('SPAWN_UNIT')
                .do((action: SpawnUnitAction) => {
                    const socketId = action.payload.socketId
                    if (store.getState().socketIdToUnitId[socketId] && gameIo.sockets.connected[socketId]) {
                        gameIo.sockets.connected[socketId].emit('ASSIGN_UNIT_ID', store.getState().socketIdToUnitId[socketId])
                    }
                    syncIo.sockets.emit('ASSIGN_UNIT_ID', { socketId, unitId: store.getState().socketIdToUnitId[socketId] })
                })
                .flatMapTo(Observable.empty())
        }
    ]
}