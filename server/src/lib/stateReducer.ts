import { AnyAction } from 'redux'
import { Unit, KnightUnit, DragonUnit, Board, BOARD_SIZE, makeUnit, createEmptyBoard, getRandomInt, findUnitInBoard } from './util'
import { GameAction, ExecutionAction, SpawnUnitAction, RemoveUnitAction } from './actions'
import { Logger } from './Logger';
import { dissoc } from 'ramda'

interface ActionHistory {
    timestamp: number,
    prevBoardState: Board,
    action: GameAction,
}

export interface GameState {
    nextId: number,
    timestamp: number,
    board: Board,
    executionQueue: GameAction[],
    forwardQueue: GameAction[],
    history: ActionHistory[],
    socketIdToUnitId: {[socketId: string]: number}
}

export const INIT_STATE = {
    nextId: 1,
    timestamp: 1,
    board: createEmptyBoard() as Board,
    executionQueue: [] as GameAction[],
    forwardQueue: [] as GameAction[],
    history: [] as ActionHistory[],
    socketIdToUnitId: {}
} as GameState

const log = Logger.getInstance('reducer')

export function stateReducer(state: GameState = INIT_STATE, action: GameAction | ExecutionAction): GameState {
    // TODO: Handle timestamps
    // TODO: Handle forwarding
    switch (action.type) {
        case 'ADD_TO_QUEUE': {
            // TODO: Decide to forward/exec queue
            const a = action as ExecutionAction
            const executionItem = {...a.action, timestamp: a.timestamp}
            return {
                ...state,
                executionQueue: [ ...state.executionQueue, executionItem as GameAction ],
            }
        }

        case 'EXECUTE': {
            // TODO: Handle timestamp
            return {
                ...state.executionQueue.reduce(stateReducer, state) as GameState,
                executionQueue: [],
            }
        }

        // ---- Game Events ----
        case 'SPAWN_UNIT': {
            const unitType = (action as SpawnUnitAction).payload.type
            const socketId = (action as SpawnUnitAction).payload.socketId

            let randomX = 0
            let randomY = 0
            do { 
                randomX = getRandomInt(0, BOARD_SIZE - 1)
                randomY = getRandomInt(0, BOARD_SIZE - 1)
            } while (state.board[randomX][randomY].type !== 'EMPTY')

            state.board[randomX][randomY] = makeUnit(unitType, state.nextId)
    
            return {
                ...state,
                nextId: state.nextId + 1,
                timestamp: state.timestamp + 1,
                board: [...state.board],
                socketIdToUnitId: {
                    ...state.socketIdToUnitId,
                    [socketId]: state.nextId,
                }
            }
        }

        case 'REMOVE_UNIT': {
            const socketId = (action as RemoveUnitAction).payload.socketId

            if (state.socketIdToUnitId[socketId]) {
                const location = findUnitInBoard(state.board, state.socketIdToUnitId[socketId])
                if (location) {
                    state.board[location[0]][location[1]] = makeUnit('EMPTY')
                    return {
                        ...state,
                        timestamp: state.timestamp + 1,
                        board: [...state.board],
                        socketIdToUnitId: dissoc(socketId, state.socketIdToUnitId),
                    }
                }
            }

            return state
        }
    }

    return state
}