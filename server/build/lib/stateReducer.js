"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const Logger_1 = require("./Logger");
const ramda_1 = require("ramda");
exports.INIT_STATE = {
    nextId: 1,
    timestamp: 1,
    board: util_1.createEmptyBoard(),
    executionQueue: [],
    forwardQueue: [],
    history: [],
    socketIdToUnitId: {}
};
const log = Logger_1.Logger.getInstance('reducer');
function stateReducer(state = exports.INIT_STATE, action) {
    // TODO: Handle timestamps
    // TODO: Handle forwarding
    switch (action.type) {
        case 'ADD_TO_QUEUE': {
            // TODO: Decide to forward/exec queue
            const a = action;
            const executionItem = Object.assign({}, a.action, { timestamp: a.timestamp });
            return Object.assign({}, state, { executionQueue: [...state.executionQueue, executionItem] });
        }
        case 'EXECUTE': {
            // TODO: Handle timestamp
            return Object.assign({}, state.executionQueue.reduce(stateReducer, state), { executionQueue: [] });
        }
        // ---- Game Events ----
        case 'SPAWN_UNIT': {
            const unitType = action.payload.type;
            const socketId = action.payload.socketId;
            let randomX = 0;
            let randomY = 0;
            do {
                randomX = util_1.getRandomInt(0, util_1.BOARD_SIZE - 1);
                randomY = util_1.getRandomInt(0, util_1.BOARD_SIZE - 1);
            } while (state.board[randomX][randomY].type !== 'EMPTY');
            state.board[randomX][randomY] = util_1.makeUnit(unitType, state.nextId);
            return Object.assign({}, state, { nextId: state.nextId + 1, timestamp: state.timestamp + 1, board: [...state.board], socketIdToUnitId: Object.assign({}, state.socketIdToUnitId, { [socketId]: state.nextId }) });
        }
        case 'REMOVE_UNIT': {
            const socketId = action.payload.socketId;
            if (state.socketIdToUnitId[socketId]) {
                const location = util_1.findUnitInBoard(state.board, state.socketIdToUnitId[socketId]);
                if (location) {
                    state.board[location[0]][location[1]] = util_1.makeUnit('EMPTY');
                    return Object.assign({}, state, { timestamp: state.timestamp + 1, board: [...state.board], socketIdToUnitId: ramda_1.dissoc(socketId, state.socketIdToUnitId) });
                }
            }
            return state;
        }
    }
    return state;
}
exports.stateReducer = stateReducer;
