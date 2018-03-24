import { GameAction, ExecutionAction } from './actions'
import { Observable } from 'rxjs'
import 'rxjs'
import { Store, AnyAction } from 'redux'
import { GameState } from './stateReducer'
import { ActionsObservable } from 'redux-observable'
import { Logger } from './Logger';

const log = Logger.getInstance('Log')

export function loggerEpic(action$: ActionsObservable<GameAction | ExecutionAction>, store: Store<GameState>): Observable<GameAction | ExecutionAction> {
    return action$
        .do((action) => log.info(action))
        .flatMapTo(Observable.empty())
}