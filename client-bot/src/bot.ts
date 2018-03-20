// Client bot script
const io = require('socket.io-client');
import {Board} from './Board';
import {Observable} from 'rxjs';

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const servers = [
    'localhost:8000',
    'localhost:8001',
    'localhost:8002',
]

let randomServer = `http://${servers[getRandomInt(0, servers.length - 1)]}`;
let socket = io.connect(randomServer, { reconnection: false });

const state = {
    connected: false,
    board: null as (Board | null),
    timestamp: 0,
    unitId: -1,
};

const connect = function() {
    randomServer = `http://${servers[getRandomInt(0, servers.length - 1)]}`;
    socket = io.connect(randomServer, { reconnection: false });
    console.log('---> Connecting to: ', randomServer);

    socket.on('connect', () => {
        console.log('---> Connected to ', randomServer);
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
            // console.log('--> Got state update');
            state.board = board;
            state.timestamp = timestamp;
        });

        socket.on('disconnect', () => {
            console.log('disconnected');
            state.connected = false;
        });
    });
}

// Socket kickstarter
Observable
    .interval(2500)
    .startWith(0)
    .filter(() => !state.connected)
    .subscribe(() => {
        connect();
    })

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
            // console.log('Yay! Dragons are dead!');
            // process.exit(0);
        }

        // Emit a random action
        // TODO: Check the health and move towards another player if health is low
        // else move toward nearest dragon and attack
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

// Event loop wait
(function wait () {
    if (isAlive()) setTimeout(wait, 1000);
})();