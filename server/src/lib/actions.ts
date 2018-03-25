import { Action } from 'redux'
import { UnitType } from './util';

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
    type: 'ADD_TO_QUEUE' | 'DRAIN_EXECUTE_QUEUE',
    action?: GameAction,
}

export function addToQueue(timestamp: number, action: GameAction): ExecutionAction {
    return {
        timestamp,
        type: 'ADD_TO_QUEUE',
        action,
    }
}

export function drainExecuteQueue(): ExecutionAction {
    return {
        type: 'DRAIN_EXECUTE_QUEUE',
    }
}