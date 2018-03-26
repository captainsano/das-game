"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const Logger_1 = require("./Logger");
const ramda_1 = require("ramda");
exports.INIT_STATE = {
    timestamp: 0,
    nextId: 1,
    connecting: true,
    isMaster: false,
    masterSocket: null,
    board: util_1.createEmptyBoard(),
    executionQueue: [],
    forwardQueue: [],
    history: [],
    socketIdToUnitId: {}
};
const log = Logger_1.Logger.getInstance('reducer');
function stateReducer(state = exports.INIT_STATE, action) {
    switch (action.type) {
        case 'MASTER_SERVER_SYNC': {
            return Object.assign({}, state, action.payload, { socketIdToUnitId: Object.assign({}, action.payload.socketIdToUnitId, state.socketIdToUnitId) });
        }
        case 'SET_SYNC_STATE': {
            // TODO: Place items in execution queue/forward queue based on this
            return Object.assign({}, state, action.payload, { executionQueue: [...(action.payload.isMaster ? [...state.executionQueue, ...state.forwardQueue] : [])], forwardQueue: [...(action.payload.isMaster ? [] : [...state.executionQueue, ...state.forwardQueue])] });
        }
        case 'ADD_TO_QUEUE': {
            const a = action;
            const executionItem = Object.assign({}, a.action, { timestamp: a.timestamp });
            return Object.assign({}, state, { executionQueue: [...state.executionQueue, executionItem] });
        }
        case 'ADD_TO_FORWARD_QUEUE': {
            const a = action;
            const forwardItem = Object.assign({}, a.action, { timestamp: a.timestamp });
            return Object.assign({}, state, { forwardQueue: [...state.forwardQueue, forwardItem] });
        }
        case 'DRAIN_EXECUTE_QUEUE': {
            return Object.assign({}, state, { executionQueue: [] });
        }
        case 'DRAIN_FORWARD_QUEUE': {
            return Object.assign({}, state, { forwardQueue: [] });
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
        case 'MOVE_UNIT': {
            const unitId = action.payload.unitId;
            const direction = action.payload.direction;
            return Object.assign({}, state, { timestamp: state.timestamp + 1, board: util_1.moveUnitOnBoard(state.board, unitId, direction) });
        }
        case 'ATTACK_UNIT': {
            const unitId = action.payload.unitId;
            const target = action.payload.target;
            // Find nearest dragon unit and reduce its health
            const location = util_1.findUnitInBoard(state.board, unitId);
            if (location != null) {
                for (let i = 0; i < util_1.BOARD_SIZE; i++) {
                    for (let j = 0; j < util_1.BOARD_SIZE; j++) {
                        if (state.board[i][j].type === target && util_1.getDistance(location, [i, j]) <= 2) {
                            const updatedHealth = state.board[i][j].health - state.board[location[0]][location[1]].attack;
                            const affectedUnit = state.board[i][j];
                            state.board[i][j] = updatedHealth <= 0 ? util_1.makeUnit('EMPTY') : Object.assign({}, state.board[i][j], { health: updatedHealth });
                            // If the unit's health is 0 then remove the unit from sockets as well (equal to disconnection)
                            const newSocketIdToUnitId = (() => {
                                if (updatedHealth <= 0) {
                                    for (let k in state.socketIdToUnitId) {
                                        if (state.socketIdToUnitId[k] === affectedUnit.id) {
                                            return ramda_1.dissoc(k, state.socketIdToUnitId);
                                        }
                                    }
                                }
                                return state.socketIdToUnitId;
                            })();
                            return Object.assign({}, state, { timestamp: state.timestamp + 1, board: [...state.board], socketIdToUnitId: Object.assign({}, newSocketIdToUnitId) });
                        }
                    }
                }
            }
            return state;
        }
        case 'HEAL_UNIT': {
            const unitId = action.payload.unitId;
            // Find nearest dragon unit and reduce its health
            const location = util_1.findUnitInBoard(state.board, unitId);
            if (location != null) {
                for (let i = 0; i < util_1.BOARD_SIZE; i++) {
                    for (let j = 0; j < util_1.BOARD_SIZE; j++) {
                        if (state.board[i][j].type === 'KNIGHT' &&
                            state.board[i][j].id !== unitId &&
                            util_1.getDistance(location, [i, j]) <= 5) {
                            state.board[i][j].health = Math.min(state.board[i][j].health + state.board[location[0]][location[1]].attack, state.board[i][j].maxHealth);
                            return Object.assign({}, state, { timestamp: state.timestamp + 1, board: [...state.board] });
                        }
                    }
                }
            }
            return state;
        }
    }
    return state;
}
exports.stateReducer = stateReducer;
