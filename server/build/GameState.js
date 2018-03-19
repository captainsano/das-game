"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* Utility functions */
function damage(unit, points) {
    return Object.assign({}, unit, { health: Math.max(0, unit.health - points) });
}
exports.damage = damage;
function heal(unit, points) {
    return Object.assign({}, unit, { health: Math.min(unit.maxHealth, unit.health + points) });
}
exports.heal = heal;
const isInsideBoard = function isInsideBoard(size, i) {
    if (i < 0)
        return false;
    if (i > (size - 1))
        return false;
    return true;
};
/**
 * Move unit from x1, y1 to x2, y2
 * @param {(Unit | null)[][]} board
 * @param {[number , number]} from
 * @param {[number , number]} to
 * @returns The updated board or null on invalid move
 */
const moveUnit = function moveUnit(board, [x1, y1], [x2, y2]) {
    const SIZE = board.length;
    // check if locations are inside bounds
    if (!isInsideBoard(SIZE, x1) ||
        !isInsideBoard(SIZE, y1) ||
        !isInsideBoard(SIZE, x2) ||
        !isInsideBoard(SIZE, y2)) {
        return null;
    }
    // Check if there is a unit on the from position
    if (board[x1][y1] === null) {
        return null;
    }
    // Check if the to position is occupied
    if (board[x2][y2] !== null) {
        return null;
    }
    // Check if the movement is legal
    if ((Math.abs(x2 - x1) === 1 && Math.abs(y2 - y1) === 0) ||
        (Math.abs(x2 - x1) === 0) && (Math.abs(y2 - y1) === 1)) {
        board[x2][y2] = board[x1][y1];
        board[x1][y1] = null;
    }
    return null;
};
const BOARD_SIZE = 10;
/**
 * Represents the game state
 */
class GameState {
    constructor() {
        this._timestamp = 0;
        this._board = [];
        this.nextId = 1;
        // Array of boards to maintain the state
        this.snapshots = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            this._board[i] = [];
            for (let j = 0; j < BOARD_SIZE; j++) {
                this._board[i].push(null);
            }
        }
    }
    get board() {
        return [...this._board];
    }
    get timestamp() {
        return this._timestamp;
    }
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
    spawnUnit() {
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
                    type: Math.random() >= 0.5 ? 'dragon' : 'player',
                };
                return id;
            }
        }
    }
    /**
     * Checks whether the the board contains a unit with the given id
     */
    hasUnit(id) {
        return this.getUnitLocation(id) != null;
    }
    /**
     * Returns unit location else null
     */
    getUnitLocation(id) {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.board[i][j] && this.board[i][j].id === id) {
                    return [i, j];
                }
            }
        }
        return null;
    }
    /**
     * Move the unit id to a new location. Updates the game state and timestamp
     */
    moveUnit(from, to) {
        const newBoard = moveUnit(this.board, from, to);
        if (newBoard) {
            this._board = newBoard;
            this._timestamp = this._timestamp + 1;
            return true;
        }
        return false;
    }
}
GameState.instance = null;
exports.GameState = GameState;
