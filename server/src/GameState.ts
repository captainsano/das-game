import { Unit } from './Unit'
import { Board, Square } from './Types'
import { clone } from 'ramda'

/* Utility functions */
export function damage(unit: Unit, points: number) {
  return { ...unit, health: Math.max(0, unit.health - points) };
}

export function heal(unit: Unit, points: number) {
  return { ...unit, health: Math.min(unit.maxHealth, unit.health + points) };
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function isInsideBoard(size: number, i: number): boolean {
  if (i < 0) return false;
  if (i > (size - 1)) return false;

  return true;
};

export function getDistance([x1, y1]: Square, [x2, y2]: Square) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};

/**
 * Move unit from x1, y1 to x2, y2
 * @param {(Unit | null)[][]} board
 * @param {[number , number]} from
 * @param {[number , number]} to
 * @returns The updated board or null on invalid move
 */
const moveUnit = function moveUnit(board: Board, [x1, y1]: Square, [x2, y2]: Square): boolean {
  const SIZE = board.length;
  // check if locations are inside bounds
  if (
    !isInsideBoard(SIZE, x1) ||
    !isInsideBoard(SIZE, y1) ||
    !isInsideBoard(SIZE, x2) ||
    !isInsideBoard(SIZE, y2)
  ) {
    return false
  }

  // Check if there is a unit on the from position
  if (board[x1][y1] === null) {
    return false;
  }

  // Check if the to position is occupied
  if (board[x2][y2] !== null) {
    return false;
  }


  // Check if the unit being moved is not a dragon
  if (board[x1][y1]!.type === 'dragon') {
    return false;
  }

  // Check if the movement is legal
  if (
    (Math.abs(x2 - x1) === 1 && Math.abs(y2 - y1) === 0) ||
    (Math.abs(x2 - x1) === 0) && (Math.abs(y2 - y1) === 1)
  ) {
    board[x2][y2] = board[x1][y1];
    board[x1][y1] = null;
    return true
  }

  return false;
};

export function printBoard(board: Board) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    let line = ''
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j]) {
        line += ` ${board[i][j]!.type === 'dragon' ? 'D' : 'K'} `
      } else {
        line += ` . `
      }
    }
    console.log(`${line}`)
  }
}

interface Snapshot {
  timestamp: number,
  board: Board,
}

const BOARD_SIZE = 25

/**
 * Represents the game state
 */
export class GameState {
  private static instance: GameState | null = null

  private _timestamp = 0
  private _board: Board = []
  private _replaying: boolean = false
  private nextId = 1

  get board() {
    return clone(this._board)
  }

  get timestamp() {
    return this._timestamp
  }

  get replaying() {
    return this._replaying
  }

  set replaying(replaying: boolean) {
    this._replaying = replaying
  }

  setState(board: Board, timestamp: number) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j]) {
          this._board[i][j] = { ...board[i][j] } as Unit
        } else {
          this._board[i][j] = null
        }
      }
    }
    this._timestamp = timestamp;
  }

  private constructor() {
    for (let i = 0; i < BOARD_SIZE; i++) {
      this._board[i] = [];
      for (let j = 0; j < BOARD_SIZE; j++) {
        this._board[i].push(null);
      }
    }
  }

  private incrementTimestamp() {
    this._timestamp = this._timestamp + 1;
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
  spawnUnit(type: 'dragon' | 'player' = 'player', at?: Square): number {
    const health = type === 'player' ? getRandomInt(10, 20) : getRandomInt(50, 100);
    const attack = type === 'player' ? getRandomInt(1, 10) : getRandomInt(5, 20);

    if (!at) {
      while (true) {
        const randomX = getRandomInt(0, BOARD_SIZE - 1);
        const randomY = getRandomInt(0, BOARD_SIZE - 1);

        if (this._board[randomX][randomY] === null) {
          at = [randomX, randomY];
          break;
        }
      }
    }

    const id = this.nextId;
    this.nextId = this.nextId + 1;
    this._board[at[0]][at[1]] = {
      id: type === 'dragon' ? -1 * id : id,
      type,
      health,
      attack,
      maxHealth: health,
    };

    this.incrementTimestamp();
    return id;
  }

  /**
   * Remove a unit from the board
   * @param unitId The unit id to remove
   */
  removeUnit(unitId: number): boolean {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this._board[i][j] && this._board[i][j]!.id === unitId) {
          this._board[i][j] = null
          return true
        }
      }
    }
    return false
  }

  getDragonCount(): number {
    let dragonCount = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.board[i][j] && this.board[i][j]!.type === 'dragon') {
          dragonCount += 1;
        }
      }
    }
    return dragonCount;
  }

  /**
   * Checks whether the the board contains a unit with the given id
   */
  hasUnit(id: number): boolean {
    return this.getUnitLocation(id) != null;
  }

  /**
   * Returns unit location else null
   */
  getUnitLocation(id: number): Square | null {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (this.board[i][j] && this.board[i][j]!.id === id) {
          return [i, j];
        }
      }
    }

    return null;
  }

  /**
   * Move the unit id to a new location. Updates the game state and timestamp
   */
  moveUnit(from: Square, to: Square): boolean {
    if (moveUnit(this._board, from, to)) {
      this.incrementTimestamp();
      return true;
    }

    return false;
  }

  /**
   * Heal the unit located at given location
   */
  healUnit(from: Square, to: Square): boolean {
    // Make sure a player is present in the from location and to location
    if (!this.board[from[0]][from[1]] || (this.board[from[0]][from[1]] && this.board[from[0]][from[1]]!.type !== 'player')) {
      return false
    }

    if (!this.board[to[0]][to[1]] || (this.board[to[0]][to[1]] && this.board[to[0]][to[1]]!.type !== 'player')) {
      return false
    }

    // Check if the healing distance is not more than 5
    if (getDistance(from, to) > 5) {
      return false;
    }

    this._board[to[0]][to[1]] = heal(this.board[to[0]][to[1]]!, this.board[from[0]][from[1]]!.attack);

    this.incrementTimestamp();
    return true;
  }

  /**
   * Attack the unit located at given location
   */
  attackUnit(from: Square, to: Square): boolean {
    // Make sure a unit is present in the from and to location
    if (!this.board[from[0]][from[1]] || !this.board[to[0]][to[1]]) {
      return false
    }

    // Make sure the types of the units are different
    if (this.board[from[0]][from[1]]!.type === this.board[to[0]][to[1]]!.type) {
      return false
    }

    // Check if the attacking distance is not more than 2
    if (getDistance(from, to) > 2) {
      return false;
    }

    const newUnit = damage(this.board[to[0]][to[1]]!, this.board[from[0]][from[1]]!.attack);
    this._board[to[0]][to[1]] = newUnit.health <= 0 ? null : newUnit;

    this.incrementTimestamp();
    return true;
  }

  /**
   * Returns the nearest square of the given unit type at a max distance else null
   */
  findNearestUnitOfType([x, y]: Square, distance: number, type: 'dragon' | 'player'): Square | null {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (i === x && j === y) continue;

        if (this.board[i][j] !== null && this.board[i][j]!.type === type) {
          if (getDistance([x, y], [i, j]) <= distance) {
            return [i, j];
          }
        }
      }
    }

    return null;
  }

  /**
   * Returns a random vacant square
   */
  getRandomVacantSquare(): Square {
    while (true) {
      const randomX = getRandomInt(0, this.board.length - 1);
      const randomY = getRandomInt(0, this.board.length - 1);

      if (this.board[randomX][randomY] === null) {
        return [randomX, randomY];
      }
    }
  }

  /**
   * Print the board state in ASCII for debug purpose
   */
  print() {
    console.log()
    console.log('--> Timestamp: ', this.timestamp)
    printBoard(this.board)
    console.log()
  }
}