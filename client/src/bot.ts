// Client bot script
const io = require('socket.io-client');
import {Board} from './Board';
import {Observable} from 'rxjs';

const socket = io.connect('http://localhost:8000', {reconnect: true});

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const state = {
    connected: false,
    board: null as (Board | null),
    timestamp: 0,
    unitId: -1,
};

socket.on('connect', () => {
    state.connected = true;

    if (state.unitId === -1) {
        socket.emit('SPAWN', {}, (id: number) => {
            state.unitId = id;
            console.log('---> Unit id: ', id);
        });
    } else {
        socket.emit('RECONNECT', {id: state.unitId}, (id: number | null) => {
            if (id) {
                state.unitId = id;
            }
        });
    }

    // Start listening to game state
    socket.on('STATE_UPDATE', ({board, timestamp}: { board: Board, timestamp: number }) => {
        state.board = board;
        state.timestamp = timestamp;
    });

    socket.on('disconnect', () => {
        state.connected = false;
        socket.off('STATE_UPDATE');
    });
});

const isAlive = function isAlive(): boolean {
    if (state.board == null) {
        return true;
    }

    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j]!.id === state.unitId) {
                return true;
            }
        }
    }

    return false;
};

const getDragonsCount = function getDragonsCount(): number | null {
    if (state.board == null) {
        return null;
    }

    let dragonsCount = 0;

    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j]!.type === 'dragon') {
                dragonsCount += 1;
            }
        }
    }

    return dragonsCount;
};

// Game loop
Observable
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
            {unitId: state.unitId, action: 'ATTACK', timestamp: state.timestamp},
            {unitId: state.unitId, action: 'HEAL', timestamp: state.timestamp},
            {unitId: state.unitId, action: 'LEFT', timestamp: state.timestamp},
            {unitId: state.unitId, action: 'UP', timestamp: state.timestamp},
            {unitId: state.unitId, action: 'RIGHT', timestamp: state.timestamp},
            {unitId: state.unitId, action: 'DOWN', timestamp: state.timestamp},
        ];

        // Emit a random action
        socket.emit('MESSAGE', actions[getRandomInt(0, actions.length - 1)]);
    });