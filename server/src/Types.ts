import { Unit } from "./Unit";

export type Board = (Unit | null)[][]
export type Square = [number, number]

export const GAMEPLAY_INTERVAL = 10;

export interface ClientMessage {
  timestamp: number,
  action: string,

  [key: string]: any,
}

export interface GameEvent {
  timestamp: number,
  unitId: number,
  action: 'HEAL' | 'ATTACK' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'PLAYER_ATTACK' | 'SPAWN_UNIT' | 'REMOVE_UNIT',
}

export interface PlayerAttackEvent extends GameEvent {
  action: 'PLAYER_ATTACK',
  from: Square,
  to: Square,
}

export interface SpawnUnitEvent extends GameEvent {
  action: 'SPAWN_UNIT',
  at: Square,
  type: 'player' | 'dragon',
  respond?: Function,
  socketId?: string,
}