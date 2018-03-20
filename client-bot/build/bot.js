"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Client bot script
const io = require('socket.io-client');
const rxjs_1 = require("rxjs");
console.log('Bot started');
const socket = io.connect('http://localhost:8000', { reconnect: true });
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
exports.getRandomInt = getRandomInt;
const state = {
    connected: false,
    board: null,
    timestamp: 0,
    unitId: -1,
};
socket.on('connect', () => {
    state.connected = true;
    if (state.unitId === -1) {
        socket.emit('SPAWN', {}, (id) => {
            state.unitId = id;
            console.log('---> Unit id: ', id);
        });
    }
    else {
        socket.emit('RECONNECT', { id: state.unitId }, (id) => {
            if (id) {
                state.unitId = id;
            }
        });
    }
    // Start listening to game state
    socket.on('STATE_UPDATE', ({ board, timestamp }) => {
        state.board = board;
        state.timestamp = timestamp;
    });
    socket.on('disconnect', () => {
        state.connected = false;
        socket.off('STATE_UPDATE');
    });
});
const isAlive = function isAlive() {
    if (state.board == null) {
        return true;
    }
    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j].id === state.unitId) {
                return true;
            }
        }
    }
    return false;
};
const getDragonsCount = function getDragonsCount() {
    if (state.board == null) {
        return null;
    }
    let dragonsCount = 0;
    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j].type === 'dragon') {
                dragonsCount += 1;
            }
        }
    }
    return dragonsCount;
};
// Game loop
rxjs_1.Observable
    .interval(1500)
    .filter(() => state.connected)
    .subscribe(() => {
    if (!isAlive()) {
        process.exit(0);
    }
    const dragonsCount = getDragonsCount();
    if (dragonsCount != null && dragonsCount === 0) {
        console.log('Yay! Dragons are dead!');
        process.exit(0);
    }
    // Emit a random action
    // TODO: Check the health and move towards another player if health is low
    // TODO: Heal if another player is nearby
    const actions = [
        { unitId: state.unitId, action: 'ATTACK', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'HEAL', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'LEFT', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'UP', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'RIGHT', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'DOWN', timestamp: state.timestamp },
    ];
    // Emit a random action
    socket.emit('MESSAGE', actions[getRandomInt(0, actions.length - 1)]);
});
