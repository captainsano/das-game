import { Action } from 'redux'

export interface GameAction extends Action {
    timestamp?: number,
    type: string,
    payload: object,
}

export interface SpawnUnitAction extends GameAction {
    type: 'SPAWN_UNIT',
    payload: {
        timestamp: number,
        type: 'KNIGHT' | 'DRAGON',
        socketId: string
    }
}

export function spawnUnit(socketId: string, type: 'KNIGHT' | 'DRAGON'): GameAction {
    return {
        type: 'SPAWN_UNIT',
        payload: { type, socketId }
    }
}

export interface RemoveUnitAction extends GameAction {
    type: 'REMOVE_UNIT',
    payload: {
        timestamp: number,
        socketId: string
    }
}

export function removeUnit(socketId: string): GameAction {
    return {
        type: 'REMOVE_UNIT',
        payload: { socketId }
    }
}

export interface ExecutionAction extends Action {
    timestamp?: number,
    type: 'ADD_TO_QUEUE' | 'EXECUTE',
    action?: GameAction,
}

export function addToQueue(timestamp: number, action: GameAction): ExecutionAction {
    return {
        timestamp,
        type: 'ADD_TO_QUEUE',
        action,
    }
}

export function execute(): ExecutionAction {
    return {
        type: 'EXECUTE',
    }
}