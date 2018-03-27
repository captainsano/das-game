"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const actions_1 = require("./actions");
const findNearestKnight = function findNearestKnight(board, from, maxDistance) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (util_1.getDistance(from, [i, j]) <= maxDistance && board[i][j].type === 'KNIGHT') {
                return [i, j];
            }
        }
    }
    return null;
};
function dragonsAttack(store) {
    const state = store.getState();
    if (state) {
        // For each dragon, find nearest player and attack
        for (let i = 0; i < state.board.length; i++) {
            for (let j = 0; j < state.board.length; j++) {
                if (state.board[i][j].type === 'DRAGON') {
                    const nearestPlayerLocation = findNearestKnight(state.board, [i, j], 2);
                    if (nearestPlayerLocation) {
                        store.dispatch(actions_1.addToQueue(state.timestamp, actions_1.attackUnit(state.board[i][j].id, 'KNIGHT')));
                    }
                }
            }
        }
    }
}
exports.default = dragonsAttack;
