"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
require("rxjs");
const Logger_1 = require("./Logger");
const log = Logger_1.Logger.getInstance('LoggerEpic');
function epicFactory(io) {
    return [
        function loggerEpic(action$, store) {
            return action$
                .flatMapTo(rxjs_1.Observable.empty());
        },
        function spawnUnitResponderEpic(action$, store) {
            return action$.ofType('SPAWN_UNIT')
                .do((action) => {
                const socketId = action.payload.socketId;
                if (store.getState().socketIdToUnitId[socketId] && io.sockets.connected[socketId]) {
                    io.sockets.connected[socketId].emit('ASSIGN_UNIT_ID', store.getState().socketIdToUnitId[socketId]);
                }
            })
                .flatMapTo(rxjs_1.Observable.empty());
        }
    ];
}
exports.default = epicFactory;
