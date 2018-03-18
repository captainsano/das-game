// Utility functions
import { Unit } from './Unit';

/* Utility functions */
export function damage(unit: Unit, points: number) {
  return {...unit, health: Math.max(0, unit.health - points)};
}

export function heal(unit: Unit, points: number) {
  return {...unit, health: Math.min(unit.maxHealth, unit.health + points)};
}

export type Board = (Unit | null)[][]
export type Square = [number, number]

/**
 * Move unit from x1, y1 to x2, y2
 * @param {(Unit | null)[][]} board
 * @param {[number , number]} from
 * @param {[number , number]} to
 * @returns The updated board or null on invalid move
 */
export function moveUnit(board: Board, [x1, y1]: Square, [x2, y2]: Square): Board | null {
  // Check if there is a unit on the from position
  if (board[x1][y1] === null) {
    return null;
  }

  // Check if the to position is occupied
  if (board[x2][y2] !== null) {
    return null;
  }

  // Check if the movement is legal
  if (
    (Math.abs(x2 - x1) === 1 && Math.abs(y2 - y1) === 0) ||
    (Math.abs(x2- x1) === 0) && (Math.abs(y2 - y1) === 1)
  ) {
    board[x2][y2] = board[x1][y1];
    board[x1][y1] = null;
  }

  return null;
}

interface Snapshot {
  timestamp: number,
  board: Board,
}

const BOARD_SIZE = 5;

/**
 * Represents the game state
 */
export class GameState {
  private static instance: GameState | null = null;

  private _timestamp = 0;
  private _board: Board = [];
  private nextId = 1;

  get board() {
    return [...this._board];
  }

  get timestamp() {
    return this._timestamp;
  }

  private constructor() {
    for (let i = 0; i < BOARD_SIZE; i++) {
    this._board[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        this._board[i].push(null);
      }
    }
  }

  // Array of boards to maintain the state
  private snapshots: Snapshot[] = [];

  static getInstance() {
    if (GameState.instance === null) {
      GameState.instance = new GameState();
    }

    return GameState.instance;
  }

  /**
   * Spawn a new unit on the board
   * @returns {number} Returns the new unit's ID
   */
  spawnUnit(): number {
    while (true) {
      const randomX = Math.floor(Math.random() * (BOARD_SIZE - 1));
      const randomY = Math.floor(Math.random() * (BOARD_SIZE - 1));

      if (this._board[randomX][randomY] === null) {
        const id = this.nextId;
        this.nextId = this.nextId + 1;
        this._board[randomX][randomY] = {
          id,
          maxHealth: 50,
          health: 50,
          attack: 5,
          type: (Math.ceil(Math.random()) % 2 === 0) ? 'dragon' : 'player',
        };
        return id;
      }
    }
  }

  /**
   * Checks whether the the board contains a unit with the given id
   */
  hasUnit(id: number): boolean {
    let found = false;
    this.board.forEach((row) => {
      row.forEach((unit) => {
        if (unit && unit.id === id) {
          found = true;
        }
      })
    });

    return found;
  }
}