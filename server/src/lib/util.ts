import { MOVE_DIRECTION } from "./actions";

export type UnitType = 'KNIGHT' | 'DRAGON' | 'EMPTY'

export interface Unit {
    id: number,
    type: UnitType,
    health: number,
    attack: number,
    maxHealth: number,
}

export interface EmptyUnit extends Unit {
    type: 'EMPTY',
}

export interface DragonUnit extends Unit {
    type: 'DRAGON'
}

export interface KnightUnit extends Unit {
    type: 'KNIGHT'
}

export type Board = Unit[][]
export type Square = [number, number]

export const BOARD_SIZE = 25
export const DRAGONS_COUNT = 20

export const MAX_DRAGON_HEALTH = 60
export const MIN_DRAGON_HEALTH = 50
export const MAX_DRAGON_ATTACK = 10
export const MIN_DRAGON_ATTACK = 5

export const MAX_KNIGHT_HEALTH = 30
export const MIN_KNIGHT_HEALTH = 20
export const MAX_KNIGHT_ATTACK = 10
export const MIN_KNIGHT_ATTACK = 5

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function makeUnit(type: UnitType, id: number = -999): Unit {
    switch (type) {
        case 'KNIGHT': {
            const health = getRandomInt(10, 20)
            return {
                id,
                type: 'KNIGHT',
                attack: getRandomInt(1, 10),
                health,
                maxHealth: health
            }
        }

        case 'DRAGON': {
            const health = getRandomInt(50, 100)
            return {
                id,
                type: 'DRAGON',
                attack: getRandomInt(5, 20),
                health,
                maxHealth: health
            }
        }

        case 'EMPTY': {
            return {
                id,
                type: 'EMPTY',
                attack: 0,
                health: 1,
                maxHealth: 1
            }
        }
    }
}

export function createEmptyBoard(): Board {
    let board: Board = [] as Board
    for (let i = 0; i < BOARD_SIZE; i++) {
        board.push([] as Unit[])
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = makeUnit('EMPTY')
        }
    }
    return board
}

export function findUnitInBoard(board: Board, id: number): Square | null {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (board[i][j].id === id) return [i, j]
        }
    }
    return null
}

export function isInsideBoard(size: number, i: number): boolean {
    if (i < 0) return false
    if (i > (size - 1)) return false

    return true
}

export function getDistance([x1, y1]: Square, [x2, y2]: Square) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1)
}

/**
 * Move unit from x1, y1 to x2, y2
 * @param {(Unit | null)[][]} board
 * @param {[number , number]} from
 * @param {[number , number]} to
 * @returns The updated board or null on invalid move
 */
export function moveUnitOnBoard(board: Board, unitId: number, direction: MOVE_DIRECTION): Board {
    const from = findUnitInBoard(board, unitId)
    if (from == null) {
        return board
    }

    const to = (() => {
        switch (direction) {
            case 'LEFT': return [from[0] - 1, from[1]]
            case 'UP': return [from[0], from[1] - 1]
            case 'RIGHT': return [from[0] + 1, from[1]]
            case 'DOWN': return [from[0], from[1] + 1]
        }
        return from
    })()

    // check if locations are inside bounds
    if (
      !isInsideBoard(BOARD_SIZE, from[0]) ||
      !isInsideBoard(BOARD_SIZE, from[1]) ||
      !isInsideBoard(BOARD_SIZE, to[0]) ||
      !isInsideBoard(BOARD_SIZE, to[1])
    ) {
      return board
    }

    const [x1, y1] = from
    const [x2, y2] = to
  
    // Check if there is a unit on the from position
    if (board[x1][y1].type === 'EMPTY' || board[x2][y2].type !== 'EMPTY' || board[x1][y1].type === 'DRAGON') {
      return board
    }

    if (
      (Math.abs(x2 - x1) === 1 && Math.abs(y2 - y1) === 0) ||
      (Math.abs(x2 - x1) === 0) && (Math.abs(y2 - y1) === 1)
    ) {
      board[x2][y2] = board[x1][y1]
      board[x1][y1] = makeUnit('EMPTY')
      return [...board]
    }
  
    return board
  };
