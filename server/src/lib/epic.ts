import { GameAction, ExecutionAction, SpawnUnitAction } from './actions'
import { Observable } from 'rxjs'
import 'rxjs'
import { Store, AnyAction } from 'redux'
import { GameState } from './stateReducer'
import { ActionsObservable } from 'redux-observable'
import { Logger } from './Logger';
import { Server } from 'socket.io';

const log = Logger.getInstance('LoggerEpic')

export default function epicFactory(io: Server) {
    return [
        function loggerEpic(action$: ActionsObservable<GameAction | ExecutionAction>, store: Store<GameState>): Observable<GameAction | ExecutionAction> {
            return action$
                // .do((action) => log.info(action))
                .flatMapTo(Observable.empty())
        },
        function spawnUnitResponderEpic(action$: ActionsObservable<GameAction>, store: Store<GameState>): Observable<GameAction> {
            return action$.ofType('SPAWN_UNIT')
                .do((action: SpawnUnitAction) => {
                    const socketId = action.payload.socketId
                    if (store.getState().socketIdToUnitId[socketId] && io.sockets.connected[socketId]) {
                        io.sockets.connected[socketId].emit('ASSIGN_UNIT_ID', store.getState().socketIdToUnitId[socketId])
                    }
                })
                .flatMapTo(Observable.empty())
        }
    ]
}