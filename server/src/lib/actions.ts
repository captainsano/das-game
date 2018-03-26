import { Action } from 'redux'
import { UnitType, Board } from './util';

export interface GameAction extends Action {
    timestamp?: number,
    type: string,
    payload: object,
}

export interface SpawnUnitAction extends GameAction {
    type: 'SPAWN_UNIT',
    payload: {
        type: 'KNIGHT' | 'DRAGON',
        socketId: string
    }
}

export function spawnUnit(socketId: string, type: 'KNIGHT' | 'DRAGON'): SpawnUnitAction {
    return {
        type: 'SPAWN_UNIT',
        payload: { type, socketId }
    }
}

export interface RemoveUnitAction extends GameAction {
    type: 'REMOVE_UNIT',
    payload: {
        socketId: string
    }
}

export function removeUnit(socketId: string): RemoveUnitAction {
    return {
        type: 'REMOVE_UNIT',
        payload: { socketId }
    }
}

export type MOVE_DIRECTION = 'LEFT' | 'UP' | 'RIGHT' | 'DOWN'
export interface MoveUnitAction extends GameAction {
    type: 'MOVE_UNIT',
    payload: {
        unitId: number,
        direction: MOVE_DIRECTION
    }
}

export function moveUnit(unitId: number, direction: MOVE_DIRECTION): MoveUnitAction {
    return {
        type: 'MOVE_UNIT',
        payload: { unitId, direction }
    }
}

export interface AttackUnitAction extends GameAction {
    type: 'ATTACK_UNIT',
    payload: {
        unitId: number,
        target: UnitType
    }
}

export function attackUnit(unitId: number, target: UnitType = 'DRAGON'): AttackUnitAction {
    return {
        type: 'ATTACK_UNIT',
        payload: { unitId, target }
    }
}

export interface HealUnitAction extends GameAction {
    type: 'HEAL_UNIT',
    payload: {
        unitId: number
    }
}

export function healUnit(unitId: number): HealUnitAction {
    return {
        type: 'HEAL_UNIT',
        payload: { unitId }
    }
}

/**
 * General system execution actions
 */
export interface ExecutionAction extends Action {
    timestamp?: number,
    type: 'ADD_TO_QUEUE' | 'ADD_TO_FORWARD_QUEUE' | 'DRAIN_EXECUTE_QUEUE' | 'DRAIN_FORWARD_QUEUE' | 'SET_SYNC_STATE' | 'MASTER_SERVER_SYNC',
    action?: GameAction,
}

export interface SyncStateAction extends ExecutionAction {
    payload: {
        connecting: boolean,
        isMaster: boolean,
        masterSocket: SocketIOClient.Socket | null,
    }
}

export function setSyncState(connecting: boolean, isMaster: boolean, masterSocket: SocketIOClient.Socket | null = null): SyncStateAction {
    return {
        type: 'SET_SYNC_STATE',
        payload: { connecting, isMaster, masterSocket }
    }
}

export function addToQueue(timestamp: number, action: GameAction): ExecutionAction {
    return {
        timestamp,
        type: 'ADD_TO_QUEUE',
        action,
    }
}

export function addToForwardQueue(timestamp: number, action: GameAction): ExecutionAction {
    return {
        timestamp,
        type: 'ADD_TO_FORWARD_QUEUE',
        action,
    }
}

export function drainExecuteQueue(): ExecutionAction {
    return {
        type: 'DRAIN_EXECUTE_QUEUE',
    }
}

export function drainForwardQueue(): ExecutionAction {
    return {
        type: 'DRAIN_FORWARD_QUEUE',
    }
}

export interface MasterServerSyncAction extends ExecutionAction {
    payload: {
        timestamp: number,
        board: Board,
        socketIdToUnitId: {[socketId: string]: number}
    }
}

export function masterServerSync(timestamp: number, board: Board, socketIdToUnitId: { [socketId: string]: number }): MasterServerSyncAction {
    return {
        type: 'MASTER_SERVER_SYNC',
        payload: {
            timestamp,
            board,
            socketIdToUnitId,
        }
    }
}