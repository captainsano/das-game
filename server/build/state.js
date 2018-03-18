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
/**
 * Move unit from x1, y1 to x2, y2
 * @param {(Unit | null)[][]} board
 * @param {[number , number]} from
 * @param {[number , number]} to
 * @returns The updated board or null on invalid move
 */
function moveUnit(board, [x1, y1], [x2, y2]) {
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
}
exports.moveUnit = moveUnit;
const BOARD_SIZE = 5;
/**
 * Represents the game state
 */
class GameState {
    constructor() {
        this.timestamp = 0;
        this.board = [];
        // Array of boards to maintain the state
        this.snapshots = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            this.board[i] = [];
            for (let j = 0; j < BOARD_SIZE; j++) {
                this.board[i].push(null);
            }
        }
    }
    static getInstance() {
        if (GameState.instance === null) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }
}
GameState.instance = null;
exports.GameState = GameState;
