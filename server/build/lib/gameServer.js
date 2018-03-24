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
function gameServer(io, thisServer, mastersList) {
    const log = Logger_1.Logger.getInstance('GameServer');
    const epicMiddleware = redux_observable_1.createEpicMiddleware(epic_1.loggerEpic);
    const store = redux_1.createStore(stateReducer_1.stateReducer, stateReducer_1.INIT_STATE, redux_1.applyMiddleware(epicMiddleware));
    // New client connected
    io.on('connection', (socket) => {
        log.info({ socketId: socket.id }, `Connected new socket ${socket.id}`);
        socket.on('SPAWN_UNIT', () => {
            const timestamp = (store.getState() || { timestamp: 0 }).timestamp;
            store.dispatch(actions_1.addToQueue(timestamp, actions_1.spawnUnit(socket.id, 'KNIGHT')));
        });
        socket.on('MESSAGE', (message) => {
            const timestamp = (store.getState() || { timestamp: 0 }).timestamp;
            store.dispatch(actions_1.addToQueue(timestamp, actions_1.removeUnit(socket.id)));
        });
        socket.on('disconnect', () => {
            const timestamp = (store.getState() || { timestamp: 0 }).timestamp;
            store.dispatch(actions_1.addToQueue(timestamp, actions_1.removeUnit(socket.id)));
        });
    });
    rxjs_1.Observable
        .interval(1000)
        .delay(5000)
        .subscribe(() => store.dispatch(actions_1.execute()));
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
}
exports.default = gameServer;
