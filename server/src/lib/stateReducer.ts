import { AnyAction } from 'redux'
import { Unit, KnightUnit, DragonUnit, Board, BOARD_SIZE, makeUnit, createEmptyBoard, getRandomInt, findUnitInBoard, moveUnitOnBoard, getDistance } from './util'
import { GameAction, ExecutionAction, SpawnUnitAction, RemoveUnitAction, MoveUnitAction, AttackUnitAction, HealUnitAction, SyncStateAction } from './actions'
import { Logger } from './Logger';
import { dissoc } from 'ramda'
import { isMaster } from 'cluster';

interface ActionHistory {
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
    socketIdToUnitId: {[socketId: string]: number}
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
    socketIdToUnitId: {}
} as GameState

const log = Logger.getInstance('reducer')

export function stateReducer(state: GameState = INIT_STATE, action: GameAction | ExecutionAction): GameState {
    switch (action.type) {
        case 'SET_SYNC_STATE': {
           // TODO: Place items in execution queue/forward queue based on this
           return {
               ...state,
               ...(action as SyncStateAction).payload,
           }
        }

        case 'ADD_TO_QUEUE': {
            // TODO: Decide to forward/exec queue
            const a = action as ExecutionAction
            const executionItem = {...a.action, timestamp: a.timestamp}
            return {
                ...state,
                executionQueue: [ ...state.executionQueue, executionItem as GameAction ],
            }
        }

        case 'DRAIN_EXECUTE_QUEUE': {
            // TODO: Handle timestamp
            return {
                ...state,
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

        case 'MOVE_UNIT': {
            const unitId = (action as MoveUnitAction).payload.unitId
            const direction = (action as MoveUnitAction).payload.direction
            
            return {
                ...state,
                timestamp: state.timestamp + 1,
                board: moveUnitOnBoard(state.board, unitId, direction)
            }
        }

        case 'ATTACK_UNIT': {
            const unitId = (action as AttackUnitAction).payload.unitId
            
            // Find nearest dragon unit and reduce its health
            const location = findUnitInBoard(state.board, unitId)
            if (location != null) {
                for (let i = 0; i < BOARD_SIZE; i++) {
                    for (let j = 0; j < BOARD_SIZE; j++) {
                        if (state.board[i][j].type === 'DRAGON' && getDistance(location, [i, j]) <= 2) {
                            const updatedHealth = state.board[i][j].health - state.board[location[0]][location[1]].attack
                            state.board[i][j] = updatedHealth <= 0 ? makeUnit('EMPTY') : { ...state.board[i][j], health: updatedHealth }
                            return {
                                ...state,
                                timestamp: state.timestamp + 1,
                                board: [...state.board]
                            }
                        }
                    }
                }
            }

            return state
        }

        case 'HEAL_UNIT': {
            const unitId = (action as HealUnitAction).payload.unitId
            
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
                                board: [...state.board]
                            }
                        }
                    }
                }
            }

            return state

        }
    }

    return state
}