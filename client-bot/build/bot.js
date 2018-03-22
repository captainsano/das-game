"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Client bot script
const io = require('socket.io-client');
const rxjs_1 = require("rxjs");
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
exports.getRandomInt = getRandomInt;
const servers = [
    'localhost:8000',
    'localhost:8001',
    'localhost:8002',
];
let randomServer = `http://${servers[getRandomInt(0, servers.length - 1)]}`;
let socket = io.connect(randomServer, { reconnection: false });
const state = {
    connected: false,
    board: null,
    timestamp: 0,
    unitId: -1,
};
const connect = function () {
    randomServer = `http://${servers[getRandomInt(0, servers.length - 1)]}`;
    socket = io.connect(randomServer, { reconnection: false });
    console.log('---> Connecting to: ', randomServer);
    socket.on('connect', () => {
        console.log('---> Connected to ', randomServer);
        state.connected = true;
        if (state.unitId === -1) {
            socket.emit('SPAWN', {}, (id) => {
                state.unitId = id;
                console.log('---> Unit id: ', id);
                socket.emit('MESSAGE', { unitId: state.unitId, action: 'PING' });
            });
        }
        else {
            socket.emit('RECONNECT', { id: state.unitId }, (id) => {
                if (id) {
                    state.unitId = id;
                }
                socket.emit('MESSAGE', { unitId: state.unitId, action: 'PING' });
            });
        }
        // Start listening to game state
        socket.on('STATE_UPDATE', ({ board, timestamp }) => {
            // console.log('--> Got state update');
            state.board = board;
            state.timestamp = timestamp;
        });
        socket.on('disconnect', () => {
            console.log('disconnected');
            state.connected = false;
        });
    });
};
// Socket kickstarter
rxjs_1.Observable
    .interval(2500)
    .startWith(0)
    .filter(() => !state.connected)
    .subscribe(() => {
    connect();
});
function getDistance([x1, y1], [x2, y2]) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}
;
const getUnitLocation = function getUnitLocation() {
    if (state.board == null) {
        return null;
    }
    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j].id === state.unitId) {
                return [i, j];
            }
        }
    }
    return null;
};
const isAlive = function isAlive() {
    return getUnitLocation() != null;
};
const shouldAttack = function shouldAttack() {
    if (state.board == null) {
        return false;
    }
    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j].id === state.unitId) {
                const unit = state.board[i][j];
                return unit.health / unit.maxHealth > 0.5;
            }
        }
    }
    return false;
};
const getNearestUnit = function getNearestUnit(type) {
    const location = getUnitLocation();
    if (location != null && state.board != null) {
        for (let i = 0; i < state.board.length; i++) {
            for (let j = 0; j < state.board.length; j++) {
                if (state.board[i][j] != null && state.board[i][j].type === type) {
                    if (type === 'dragon' && getDistance(location, [i, j]) <= 2)
                        return [i, j];
                    if (type === 'player' && getDistance(location, [i, j]) <= 5)
                        return [i, j];
                }
            }
        }
    }
    return null;
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
    if (dragonsCount != null && dragonsCount === 0 && state.timestamp > 20) {
        console.log('Yay! Dragons are dead!');
        process.exit(0);
    }
    const actions = [
        { unitId: state.unitId, action: 'ATTACK', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'HEAL', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'LEFT', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'UP', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'RIGHT', timestamp: state.timestamp },
        { unitId: state.unitId, action: 'DOWN', timestamp: state.timestamp },
    ];
    // Bot Logic!
    if (shouldAttack()) {
        const nearestDragonLocation = getNearestUnit('dragon');
        if (nearestDragonLocation) {
            socket.emit('MESSAGE', actions[0]);
        }
        else {
            // Move randomly
            socket.emit('MESSAGE', actions[getRandomInt(2, actions.length - 1)]);
        }
    }
    else {
        const nearestPlayerLocation = getNearestUnit('player');
        if (nearestPlayerLocation && state.board[nearestPlayerLocation[0]][nearestPlayerLocation[1]].health < 7) {
            // If the poor guy's health is < 50% then heal
            socket.emit('MESSAGE', actions[1]);
        }
        else {
            // Move randomly
            socket.emit('MESSAGE', actions[getRandomInt(2, actions.length - 1)]);
        }
    }
});
// Event loop wait
(function wait() {
    if (isAlive())
        setTimeout(wait, 1000);
})();
