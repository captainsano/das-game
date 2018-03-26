"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rxjs");
const SocketIOClient = require("socket.io-client");
const Logger_1 = require("./Logger");
const ramda_1 = require("ramda");
const redux_1 = require("redux");
const stateReducer_1 = require("./stateReducer");
const actions_1 = require("./actions");
const redux_observable_1 = require("redux-observable");
const epic_1 = require("./epic");
const rxjs_1 = require("rxjs");
const util_1 = require("./util");
const dragonsAttack_1 = require("./dragonsAttack");
function gameServer(gameIo, syncIo, thisServer, mastersList) {
    const log = Logger_1.Logger.getInstance('GameServer');
    const rootEpic = redux_observable_1.combineEpics(...epic_1.default(gameIo, syncIo));
    const epicMiddleware = redux_observable_1.createEpicMiddleware(rootEpic);
    const store = redux_1.createStore(stateReducer_1.stateReducer, stateReducer_1.INIT_STATE, redux_1.applyMiddleware(epicMiddleware));
    // Subject to capture all events occurring in all the sockets with a delay of 250ms
    const globalSocketEvents = new rxjs_1.BehaviorSubject(['', {}]);
    // Core socket handler for the games
    gameIo.on('connection', (socket) => {
        log.info({ socketId: socket.id }, `Connection`);
        globalSocketEvents.next(['connection', { socketId: socket.id }]);
        socket.on('SPAWN_UNIT', () => {
            globalSocketEvents.next(['SPAWN_UNIT', { socketId: socket.id }]);
            const timestamp = (store.getState() || { timestamp: 0 }).timestamp;
            store.dispatch(actions_1.addToQueue(timestamp, actions_1.spawnUnit(socket.id, 'KNIGHT')));
        });
        socket.on('RECONNECT', ({ timestamp, unitId }) => {
            globalSocketEvents.next(['RECONNECT', { socketId: socket.id, timestamp, unitId }]);
            const state = store.getState();
            if (state) {
                const foundUnitId = ramda_1.find((id) => id === unitId, ramda_1.values(state.socketIdToUnitId));
                if (!foundUnitId) {
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.spawnUnit(socket.id, 'KNIGHT')));
                }
                else {
                    socket.emit('STATE_UPDATE', {
                        timestamp: store.getState().timestamp,
                        board: store.getState().board
                    });
                }
            }
        });
        socket.on('MESSAGE', ({ unitId, action, timestamp }) => {
            globalSocketEvents.next(['MESSAGE', { socketId: socket.id, unitId, action, timestamp }]);
            switch (action) {
                case 'ATTACK':
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.attackUnit(unitId)));
                    break;
                case 'HEAL':
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.healUnit(unitId)));
                    break;
                case 'LEFT':
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.moveUnit(unitId, 'LEFT')));
                    break;
                case 'UP':
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.moveUnit(unitId, 'UP')));
                    break;
                case 'RIGHT':
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.moveUnit(unitId, 'RIGHT')));
                    break;
                case 'DOWN':
                    store.dispatch(actions_1.addToQueue(timestamp, actions_1.moveUnit(unitId, 'DOWN')));
                    break;
            }
        });
        socket.on('disconnect', () => {
            log.info({ socketId: socket.id }, `Disconnect`);
            globalSocketEvents.next(['disconnect', { socketId: socket.id }]);
            const state = store.getState();
            const socketId = socket.id;
            if (state) {
                const unitId = state.socketIdToUnitId[socket.id];
                if (unitId) {
                    rxjs_1.Observable.of(0)
                        .delay(10000)
                        .takeUntil(globalSocketEvents.filter((event) => event[0] === 'RECONNECT' && event[1].unitId === unitId))
                        .subscribe(() => store.dispatch(actions_1.addToQueue(store.getState().timestamp, actions_1.removeUnit(socketId))));
                }
            }
        });
    });
    // Game execution and forward queue management
    rxjs_1.Observable
        .interval(1000)
        .filter(() => store.getState() !== null && !store.getState().connecting)
        .filter(() => store.getState() !== null && store.getState().isMaster)
        .do((val) => {
        if ((val * 1000) % 5000 === 0) {
            log.info('Dragons attack');
            dragonsAttack_1.default(store);
        }
    })
        .subscribe(() => {
        const state = store.getState();
        if (state != null && state.executionQueue.length > 0) {
            if (state.isMaster) {
                // TODO: Handle out of order timestamps and replays on execution
                state.executionQueue.forEach((a) => store.dispatch(a));
                store.dispatch(actions_1.drainExecuteQueue());
            }
            else {
                state.executionQueue.forEach((a) => store.dispatch(actions_1.addToForwardQueue(a.timestamp, a)));
                store.dispatch(actions_1.drainExecuteQueue());
            }
        }
    });
    // Forward execution queue to master server
    rxjs_1.Observable
        .interval(1000)
        .filter(() => store.getState() !== null && !store.getState().connecting)
        .filter(() => store.getState() !== null && !store.getState().isMaster && store.getState().masterSocket != null)
        .subscribe(() => {
        const state = store.getState();
        if (state != null && state.forwardQueue.length > 0) {
            // TODO: Handle special actions such as forward
            state.forwardQueue.forEach((a) => {
                log.info({ timestamp: a.timestamp, action: a }, 'Forwarding');
                state.masterSocket.emit('FORWARD', { timestamp: a.timestamp, action: a });
            });
            store.dispatch(actions_1.drainForwardQueue());
        }
    });
    // Broadcast game updates to clients, buffered by every 1second
    rxjs_1.Observable.create((o) => {
        store.subscribe(() => {
            const state = store.getState();
            if (state != null) {
                o.next(state);
            }
        });
    })
        .bufferTime(1000)
        .do((states) => {
        if (states.length > 0) {
            gameIo.sockets.emit('STATE_UPDATE', {
                timestamp: states[states.length - 1].timestamp,
                board: states[states.length - 1].board
            });
        }
    })
        .do((states) => {
        if (states.length > 0) {
            syncIo.sockets.emit('SYNC', {
                timestamp: states[states.length - 1].timestamp,
                board: states[states.length - 1].board,
                socketIdToUnitId: states[states.length - 1].socketIdToUnitId
            });
        }
    })
        .subscribe();
    // Dragon Spawn actions on game start
    rxjs_1.Observable
        .interval(1000)
        .delay(2500)
        .take(1)
        .filter(() => store.getState() !== null && !store.getState().connecting)
        .filter(() => store.getState() !== null && store.getState().isMaster)
        .subscribe(() => {
        const state = store.getState();
        if (state != null) {
            for (let i = 0; i < util_1.DRAGONS_COUNT; i++) {
                store.dispatch(actions_1.addToQueue(state.timestamp, actions_1.spawnUnit(`dragon-${i}`, 'DRAGON')));
            }
        }
    });
    // --------------- MATINTAINING CONNECTION TO MASTER / BECOMING MASTER -----------------
    const findMaster = function findMaster(thisProcess, mastersList, retryCount = 1) {
        if (mastersList.length === 0) {
            log.fatal('Masters list is empty');
            process.exit(-1);
        }
        else if (thisProcess === mastersList[0]) {
            log.info('Becoming Master');
            store.dispatch(actions_1.setSyncState(false, true));
            syncIo.on('connection', (socket) => {
                log.info('Got connection from another server');
                socket.on('FORWARD', ({ timestamp, gameAction }) => {
                    if (!timestamp || !gameAction) { }
                    else
                        store.dispatch(actions_1.addToQueue(timestamp, gameAction));
                });
                socket.on('disconnect', () => {
                    log.info('A slave server disconnected');
                });
            });
        }
        else {
            const nextMaster = mastersList[0];
            log.info({ master: nextMaster, attemp: retryCount }, 'Connecting to master');
            // Attempt connection to a master
            const io = SocketIOClient(`http://${nextMaster}`, { reconnection: false });
            const connectionTimeout = setTimeout(() => {
                if (io.connected)
                    return;
                if (retryCount < 3) {
                    findMaster(thisProcess, mastersList, retryCount + 1);
                }
                else {
                    findMaster(thisProcess, ramda_1.drop(1, mastersList));
                }
            }, 2500);
            io.on('connect', () => {
                log.info({ master: nextMaster }, 'Connection made to master');
                store.dispatch(actions_1.setSyncState(false, false, io));
                io.on('SYNC', ({ timestamp, board, socketIdToUnitId }) => {
                    store.dispatch(actions_1.masterServerSync(timestamp, board, socketIdToUnitId));
                });
                io.on('ASSIGN_UNIT_ID', ({ socketId, unitId }) => {
                    if (gameIo.sockets.connected[socketId]) {
                        gameIo.sockets.connected[socketId].emit('ASSIGN_UNIT_ID', unitId);
                    }
                });
            });
            io.on('disconnect', () => {
                log.info({ master: nextMaster }, 'Disconnected from master');
                store.dispatch(actions_1.setSyncState(true, false));
                // Retry three times
                setTimeout(() => {
                    if (!io.connected && retryCount < 3) {
                        findMaster(thisProcess, mastersList, retryCount + 1);
                    }
                    else {
                        findMaster(thisProcess, ramda_1.drop(1, mastersList));
                    }
                }, 1000 + (10 * mastersList.length));
            });
        }
    };
    findMaster(thisServer, mastersList);
}
exports.default = gameServer;
