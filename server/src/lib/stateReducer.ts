import { AnyAction } from 'redux'
import { Unit, KnightUnit, DragonUnit, Board, BOARD_SIZE, makeUnit, createEmptyBoard, getRandomInt, findUnitInBoard, moveUnitOnBoard, getDistance, findKnightUnitInBoard } from './util'
import { GameAction, ExecutionAction, SpawnUnitAction, RemoveUnitAction, MoveUnitAction, AttackUnitAction, HealUnitAction, SyncStateAction, MasterServerSyncAction, ResetStateAction } from './actions'
import { Logger } from './Logger';
import { dissoc, clone } from 'ramda'
import { isMaster } from 'cluster';

export interface ActionHistory {
    timestamp: number,
    prevBoardState: Board,
    action: GameAction | ExecutionAction,
}

export interface GameState {
    nextId: number,
    timestamp: number,
    connecting: boolean,
    isMaster: boolean,
    masterSocket: SocketIOClient.Socket | null,
    board: Board,
    executionQueue: GameAction[],
    forwardQueue: GameAction[],
    history: ActionHistory[],
}

export const INIT_STATE = {
    timestamp: 0,
    nextId: 1,
    connecting: true,
    isMaster: false,
    masterSocket: null,
    board: createEmptyBoard() as Board,
    executionQueue: [] as GameAction[],
    forwardQueue: [] as GameAction[],
    history: [] as ActionHistory[],
} as GameState

const log = Logger.getInstance('reducer')

export function stateReducer(state: GameState = INIT_STATE, action: GameAction | ExecutionAction | ResetStateAction): GameState {
    switch (action.type) {
        case 'MASTER_SERVER_SYNC': {
            return {
                ...state,
                ...(action as MasterServerSyncAction).payload
            }
        }

        case 'SET_SYNC_STATE': {
           // TODO: Place items in execution queue/forward queue based on this
           return {
               ...state,
               ...(action as SyncStateAction).payload,
               executionQueue: [...((action as SyncStateAction).payload.isMaster ? [...state.executionQueue, ...state.forwardQueue] : [])],
               forwardQueue: [...((action as SyncStateAction).payload.isMaster ? [] : [...state.executionQueue, ...state.forwardQueue])]
           }
        }

        case 'RESET_STATE': {
            return {
                ...state,
                ...(action as ResetStateAction).payload,
            }
        }

        case 'ADD_TO_QUEUE': {
            const a = action as ExecutionAction
            const executionItem = {...a.action, timestamp: a.timestamp}
            return {
                ...state,
                executionQueue: [ ...state.executionQueue, executionItem as GameAction ],
            }
        }

        case 'ADD_TO_FORWARD_QUEUE': {
            const a = action as ExecutionAction
            const forwardItem = {...a.action, timestamp: a.timestamp}
            return {
                ...state,
                forwardQueue: [ ...state.forwardQueue, forwardItem as GameAction ],
            }
        }

        case 'DRAIN_EXECUTE_QUEUE': {
            return {
                ...state,
                executionQueue: [],
            }
        }

        case 'DRAIN_FORWARD_QUEUE': {
            return {
                ...state,
                forwardQueue: [],
            }
        }

        // ---- Game Events ----
        case 'SPAWN_UNIT': {
            const unitType = (action as SpawnUnitAction).payload.type
            const socketId = (action as SpawnUnitAction).payload.socketId
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: clone(state.board),
                action: clone(action)
            }

            let randomX = 0
            let randomY = 0
            do { 
                randomX = getRandomInt(0, BOARD_SIZE - 1)
                randomY = getRandomInt(0, BOARD_SIZE - 1)
            } while (state.board[randomX][randomY].type !== 'EMPTY')

            state.board[randomX][randomY] = makeUnit(unitType, state.nextId, socketId)
    
            return {
                ...state,
                nextId: state.nextId + 1,
                timestamp: state.timestamp + 1,
                board: [...state.board],
                history: [...state.history, prevState]
            }
        }

        case 'REMOVE_UNIT': {
            const socketId = (action as RemoveUnitAction).payload.socketId
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: clone(state.board),
                action: clone(action)
            }
            
            const location = findKnightUnitInBoard(state.board, socketId)
            if (location) {
                state.board[location[0]][location[1]] = makeUnit('EMPTY')
                return {
                    ...state,
                    timestamp: state.timestamp + 1,
                    board: [...state.board],
                    history: [...state.history, prevState]
                }
            }

            return {
                ...state,
                history: [...state.history, prevState]
            }
        }

        case 'MOVE_UNIT': {
            const unitId = (action as MoveUnitAction).payload.unitId
            const direction = (action as MoveUnitAction).payload.direction
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: clone(state.board),
                action: clone(action)
            }
            
            return {
                ...state,
                timestamp: state.timestamp + 1,
                board: moveUnitOnBoard(state.board, unitId, direction),
                history: [...state.history, prevState]
            }
        }

        case 'ATTACK_UNIT': {
            const unitId = (action as AttackUnitAction).payload.unitId
            const target = (action as AttackUnitAction).payload.target
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: clone(state.board),
                action: clone(action)
            }
            
            // Find nearest dragon unit and reduce its health
            const location = findUnitInBoard(state.board, unitId)
            if (location != null) {
                for (let i = 0; i < BOARD_SIZE; i++) {
                    for (let j = 0; j < BOARD_SIZE; j++) {
                        if (state.board[i][j].type === target && getDistance(location, [i, j]) <= 2) {
                            const updatedHealth = state.board[i][j].health - state.board[location[0]][location[1]].attack
                            const affectedUnit = state.board[i][j]
                            state.board[i][j] = updatedHealth <= 0 ? makeUnit('EMPTY') : { ...state.board[i][j], health: updatedHealth }
                            
                            return {
                                ...state,
                                timestamp: state.timestamp + 1,
                                board: [...state.board],
                                history: [...state.history, prevState]
                            }
                        }
                    }
                }
            }

            return {
                ...state,
                history: [...state.history, prevState]
            }
        }

        case 'HEAL_UNIT': {
            const unitId = (action as HealUnitAction).payload.unitId
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: clone(state.board),
                action: clone(action)
            } 

            // Find nearest dragon unit and reduce its health
            const location = findUnitInBoard(state.board, unitId)
            if (location != null) {
                for (let i = 0; i < BOARD_SIZE; i++) {
                    for (let j = 0; j < BOARD_SIZE; j++) {
                        if (
                            state.board[i][j].type === 'KNIGHT' && 
                            state.board[i][j].id !== unitId && 
                            getDistance(location, [i, j]) <= 5
                        ) {
                            state.board[i][j].health = Math.min(state.board[i][j].health + state.board[location[0]][location[1]].attack, state.board[i][j].maxHealth)
                            return {
                                ...state,
                                timestamp: state.timestamp + 1,
                                board: [...state.board],
                                history: [...state.history, prevState]
                            }
                        }
                    }
                }
            }

            return {
                ...state,
                history: [...state.history, prevState]
            }
        }
    }

    return state
}