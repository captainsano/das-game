"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_SIZE = 25;
exports.DRAGONS_COUNT = 20;
exports.MAX_DRAGON_HEALTH = 60;
exports.MIN_DRAGON_HEALTH = 50;
exports.MAX_DRAGON_ATTACK = 10;
exports.MIN_DRAGON_ATTACK = 5;
exports.MAX_KNIGHT_HEALTH = 30;
exports.MIN_KNIGHT_HEALTH = 20;
exports.MAX_KNIGHT_ATTACK = 10;
exports.MIN_KNIGHT_ATTACK = 5;
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
exports.getRandomInt = getRandomInt;
function makeUnit(type, id = -999) {
    switch (type) {
        case 'KNIGHT': {
            const health = getRandomInt(10, 20);
            return {
                id,
                type: 'KNIGHT',
                attack: getRandomInt(5, 10),
                health: health / 2,
                maxHealth: health
            };
        }
        case 'DRAGON': {
            const health = getRandomInt(25, 50);
            return {
                id,
                type: 'DRAGON',
                attack: getRandomInt(10, 20),
                health,
                maxHealth: health
            };
        }
        case 'EMPTY': {
            return {
                id,
                type: 'EMPTY',
                attack: 0,
                health: 1,
                maxHealth: 1
            };
        }
    }
}
exports.makeUnit = makeUnit;
function createEmptyBoard() {
    let board = [];
    for (let i = 0; i < exports.BOARD_SIZE; i++) {
        board.push([]);
        for (let j = 0; j < exports.BOARD_SIZE; j++) {
            board[i][j] = makeUnit('EMPTY');
        }
    }
    return board;
}
exports.createEmptyBoard = createEmptyBoard;
function findUnitInBoard(board, id) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (board[i][j].id === id)
                return [i, j];
        }
    }
    return null;
}
exports.findUnitInBoard = findUnitInBoard;
function isInsideBoard(size, i) {
    if (i < 0)
        return false;
    if (i > (size - 1))
        return false;
    return true;
}
exports.isInsideBoard = isInsideBoard;
function getDistance([x1, y1], [x2, y2]) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}
exports.getDistance = getDistance;
/**
 * Move unit from x1, y1 to x2, y2
 * @param {(Unit | null)[][]} board
 * @param {[number , number]} from
 * @param {[number , number]} to
 * @returns The updated board or null on invalid move
 */
function moveUnitOnBoard(board, unitId, direction) {
    const from = findUnitInBoard(board, unitId);
    if (from == null) {
        return board;
    }
    const to = (() => {
        switch (direction) {
            case 'LEFT': return [from[0] - 1, from[1]];
            case 'UP': return [from[0], from[1] - 1];
            case 'RIGHT': return [from[0] + 1, from[1]];
            case 'DOWN': return [from[0], from[1] + 1];
        }
        return from;
    })();
    // check if locations are inside bounds
    if (!isInsideBoard(exports.BOARD_SIZE, from[0]) ||
        !isInsideBoard(exports.BOARD_SIZE, from[1]) ||
        !isInsideBoard(exports.BOARD_SIZE, to[0]) ||
        !isInsideBoard(exports.BOARD_SIZE, to[1])) {
        return board;
    }
    const [x1, y1] = from;
    const [x2, y2] = to;
    // Check if there is a unit on the from position
    if (board[x1][y1].type === 'EMPTY' || board[x2][y2].type !== 'EMPTY' || board[x1][y1].type === 'DRAGON') {
        return board;
    }
    if ((Math.abs(x2 - x1) === 1 && Math.abs(y2 - y1) === 0) ||
        (Math.abs(x2 - x1) === 0) && (Math.abs(y2 - y1) === 1)) {
        board[x2][y2] = board[x1][y1];
        board[x1][y1] = makeUnit('EMPTY');
        return [...board];
    }
    return board;
}
exports.moveUnitOnBoard = moveUnitOnBoard;
;
