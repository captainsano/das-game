// Client bot script
const io = require('socket.io-client');
import {Board, PlayerUnit} from './Board';
import {Observable} from 'rxjs';

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const servers = [
    'localhost:8000',
    // 'ec2-54-173-107-234.compute-1.amazonaws.com:8000',
    // 'ec2-54-152-208-227.compute-1.amazonaws.com:8001',
    // 'ec2-54-234-102-60.compute-1.amazonaws.com:8002',
    // 'ec2-54-85-168-103.compute-1.amazonaws.com:8003',
    // 'ec2-34-238-171-163.compute-1.amazonaws.com:8004'
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
                socket.emit('MESSAGE', {unitId: state.unitId, action: 'PING'})
            });
        } else {
            socket.emit('RECONNECT', {id: state.unitId}, (id: number | null) => {
                if (id) {
                    state.unitId = id;
                }
                socket.emit('MESSAGE', {unitId: state.unitId, action: 'PING'})
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

function getDistance([x1, y1]: [number, number], [x2, y2]: [number, number]) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
};

const getUnitLocation = function getUnitLocation(): [number, number] | null {
    if (state.board == null) {
        return null;
    }

    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j]!.id === state.unitId) {
                return [i, j];
            }
        }
    }

    return null;
}

const isAlive = function isAlive(): boolean {
    return getUnitLocation() != null
};

const shouldAttack = function shouldAttack(): boolean {
    if (state.board == null) {
        return false;
    }

    for (let i = 0; i < state.board.length; i++) {
        for (let j = 0; j < state.board.length; j++) {
            if (state.board[i][j] != null && state.board[i][j]!.id === state.unitId) {
                const unit = state.board[i][j] as PlayerUnit
                return unit.health / unit.maxHealth > 0.5
            }
        }
    }

    return false;
}

const getNearestUnit = function getNearestUnit(type: 'dragon' | 'player', maxDistance: number): [number, number] | null {
    const location = getUnitLocation();

    if (location != null && state.board != null) {
        for (let i = 0; i < state.board.length; i++) {
            for (let j = 0; j < state.board.length; j++) {
                if (state.board[i][j] != null && state.board[i][j]!.type === type && [i, j].toString() !== location.toString()) {
                    if (type === 'dragon' && getDistance(location, [i, j]) <= maxDistance) return [i, j]
                    if (type === 'player' && getDistance(location, [i, j]) <= maxDistance) return [i, j]
                }
            }
        }
    }

    return null
}

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
// Observable
//     .interval(1500)
//     // Do not send actions until connected or unitId is allocated
//     .filter(() => state.connected)
//     .filter(() => state.unitId !== -1)
//     .subscribe(() => {
//         if (!isAlive()) {
//             console.log('---> Am dead!')
//             process.exit(0);
//         }

//         const dragonsCount = getDragonsCount();
//         if (dragonsCount != null && dragonsCount === 0 && state.timestamp > 20) {
//             console.log('Yay! Dragons are dead!');
//             process.exit(0);
//         }

//         const actions = [
//             {unitId: state.unitId, action: 'ATTACK', timestamp: state.timestamp},
//             {unitId: state.unitId, action: 'HEAL', timestamp: state.timestamp},
//             {unitId: state.unitId, action: 'LEFT', timestamp: state.timestamp},
//             {unitId: state.unitId, action: 'UP', timestamp: state.timestamp},
//             {unitId: state.unitId, action: 'RIGHT', timestamp: state.timestamp},
//             {unitId: state.unitId, action: 'DOWN', timestamp: state.timestamp},
//         ];

//         // Bot Logic!
//         let action = null
//         const location = getUnitLocation()
//         if (shouldAttack()) {
//             const nearestAttackableDragonLocation = getNearestUnit('dragon', 2)
//             if (nearestAttackableDragonLocation) {
//                 action = actions[0]
//             } else {
//                 // Move towards the nearest dragon
//                 const nearestReachableDragonLocation = getNearestUnit('dragon', 13)
//                 if (nearestReachableDragonLocation && location) {
//                     if (location![0] < nearestReachableDragonLocation![0]) {
//                         action = actions[4]
//                     } else if (location![0] > nearestReachableDragonLocation![0]) {
//                         action = actions[2]
//                     } else if (location![1] > nearestReachableDragonLocation![1]) {
//                         action = actions[3]
//                     } else {
//                         action = actions[5]
//                     }
//                 } else {
//                     // Make some random movement
//                     action = actions[getRandomInt(2, actions.length - 1)]
//                 }
//             } 
//         } else {
//             const nearestPlayerLocation = getNearestUnit('player', 5)
//             if (nearestPlayerLocation && state.board![nearestPlayerLocation[0]][nearestPlayerLocation[1]]!.health < 7) {
//                 // If the poor guy's health is < 50% then heal
//                 action = actions[1]
//             } else {
//                 // Move towards the nearest dragon
//                 const nearestReachableDragonLocation = getNearestUnit('dragon', 13)
//                 if (nearestReachableDragonLocation && location) {
//                     if (location![0] < nearestReachableDragonLocation![0]) {
//                         action = actions[4]
//                     } else if (location![0] > nearestReachableDragonLocation![0]) {
//                         action = actions[2]
//                     } else if (location![1] > nearestReachableDragonLocation![1]) {
//                         action = actions[3]
//                     } else {
//                         action = actions[5]
//                     }
//                 } else {
//                     // Make some random movement
//                     action = actions[getRandomInt(2, actions.length - 1)]
//                 }
//             }
//         }

//         if (action) {
//             console.log('---> ACTION: ', action)
//             socket.emit('MESSAGE', action)
//         }
//     });

// Event loop wait
(function wait () {
    if (isAlive()) setTimeout(wait, 1000);
})();
