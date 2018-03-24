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
                health,
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
