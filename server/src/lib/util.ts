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
                attack: getRandomInt(5, 10),
                health,
                maxHealth: health
            }
        }

        case 'DRAGON': {
            const health = getRandomInt(25, 50)
            return {
                id,
                type: 'DRAGON',
                attack: getRandomInt(10, 20),
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

export function findUnitInBoard(board: Board, id: number): [number, number] | null {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (board[i][j].id === id) return [i, j]
        }
    }
    return null
}