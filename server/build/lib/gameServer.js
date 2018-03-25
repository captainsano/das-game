"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("./Logger");
const redux_1 = require("redux");
const stateReducer_1 = require("./stateReducer");
const actions_1 = require("./actions");
const redux_observable_1 = require("redux-observable");
const epic_1 = require("./epic");
require("rxjs");
const rxjs_1 = require("rxjs");
const util_1 = require("./util");
function gameServer(io, thisServer, mastersList) {
    const log = Logger_1.Logger.getInstance('GameServer');
    const rootEpic = redux_observable_1.combineEpics(...epic_1.default(io));
    const epicMiddleware = redux_observable_1.createEpicMiddleware(rootEpic);
    const store = redux_1.createStore(stateReducer_1.stateReducer, stateReducer_1.INIT_STATE, redux_1.applyMiddleware(epicMiddleware));
    // New client connected
    io.on('connection', (socket) => {
        log.info({ socketId: socket.id }, `Connected new socket ${socket.id}`);
        socket.on('SPAWN_UNIT', () => {
            const timestamp = (store.getState() || { timestamp: 0 }).timestamp;
            store.dispatch(actions_1.addToQueue(timestamp, actions_1.spawnUnit(socket.id, 'KNIGHT')));
        });
        socket.on('MESSAGE', ({ unitId, action, timestamp }) => {
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
            const timestamp = (store.getState() || { timestamp: 0 }).timestamp;
            store.dispatch(actions_1.addToQueue(timestamp, actions_1.removeUnit(socket.id)));
        });
    });
    rxjs_1.Observable
        .interval(1000)
        .subscribe(() => {
        const state = store.getState();
        if (state != null && state.executionQueue.length > 0) {
            // TODO: Handle out of order timestamps and replays
            state.executionQueue.forEach((a) => store.dispatch(a));
            store.dispatch(actions_1.drainExecuteQueue());
        }
    });
    rxjs_1.Observable.create((o) => {
        store.subscribe(() => {
            const state = store.getState();
            if (state != null) {
                o.next(state);
            }
        });
    })
        .distinctUntilChanged()
        .subscribe((state) => {
        io.sockets.emit('STATE_UPDATE', {
            timestamp: state.timestamp,
            board: state.board
        });
    });
    rxjs_1.Observable
        .interval(1000)
        .take(1)
        .subscribe(() => {
        const state = store.getState();
        if (state != null) {
            for (let i = 0; i < util_1.DRAGONS_COUNT; i++) {
                store.dispatch(actions_1.addToQueue(state.timestamp, actions_1.spawnUnit(`dragon-${i}`, 'DRAGON')));
            }
        }
    });
}
exports.default = gameServer;
