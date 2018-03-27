"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("rxjs");
const rxjs_1 = require("rxjs");
const Logger_1 = require("./Logger");
const util_1 = require("./util");
const log = Logger_1.Logger.getInstance('LoggerEpic');
function epicFactory(gameIo, syncIo) {
    return [
        function loggerEpic(action$, store) {
            return action$
                .flatMapTo(rxjs_1.Observable.empty());
        },
        function spawnUnitResponderEpic(action$, store) {
            return action$.ofType('SPAWN_UNIT')
                .do((action) => {
                const socketId = action.payload.socketId;
                const state = store.getState();
                if (state) {
                    const location = util_1.findKnightUnitInBoard(state.board, socketId);
                    if (location) {
                        const unit = state.board[location[0]][location[1]];
                        if (gameIo.sockets.connected[socketId]) {
                            gameIo.sockets.connected[socketId].emit('ASSIGN_UNIT_ID', unit.id);
                        }
                        syncIo.sockets.emit('ASSIGN_UNIT_ID', { socketId, unitId: unit.id });
                    }
                }
            })
                .flatMapTo(rxjs_1.Observable.empty());
        }
    ];
}
exports.default = epicFactory;
