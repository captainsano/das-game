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
};
const log = Logger_1.Logger.getInstance('reducer');
function stateReducer(state = exports.INIT_STATE, action) {
    switch (action.type) {
        case 'MASTER_SERVER_SYNC': {
            return Object.assign({}, state, action.payload);
        }
        case 'SET_SYNC_STATE': {
            // TODO: Place items in execution queue/forward queue based on this
            return Object.assign({}, state, action.payload, { executionQueue: [...(action.payload.isMaster ? [...state.executionQueue, ...state.forwardQueue] : [])], forwardQueue: [...(action.payload.isMaster ? [] : [...state.executionQueue, ...state.forwardQueue])] });
        }
        case 'RESET_STATE': {
            return Object.assign({}, state, action.payload);
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
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: ramda_1.clone(state.board),
                action: ramda_1.clone(action)
            };
            let randomX = 0;
            let randomY = 0;
            do {
                randomX = util_1.getRandomInt(0, util_1.BOARD_SIZE - 1);
                randomY = util_1.getRandomInt(0, util_1.BOARD_SIZE - 1);
            } while (state.board[randomX][randomY].type !== 'EMPTY');
            state.board[randomX][randomY] = util_1.makeUnit(unitType, state.nextId, socketId);
            return Object.assign({}, state, { nextId: state.nextId + 1, timestamp: state.timestamp + 1, board: [...state.board], history: [...state.history, prevState] });
        }
        case 'REMOVE_UNIT': {
            const socketId = action.payload.socketId;
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: ramda_1.clone(state.board),
                action: ramda_1.clone(action)
            };
            const location = util_1.findKnightUnitInBoard(state.board, socketId);
            if (location) {
                state.board[location[0]][location[1]] = util_1.makeUnit('EMPTY');
                return Object.assign({}, state, { timestamp: state.timestamp + 1, board: [...state.board], history: [...state.history, prevState] });
            }
            return Object.assign({}, state, { history: [...state.history, prevState] });
        }
        case 'MOVE_UNIT': {
            const unitId = action.payload.unitId;
            const direction = action.payload.direction;
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: ramda_1.clone(state.board),
                action: ramda_1.clone(action)
            };
            return Object.assign({}, state, { timestamp: state.timestamp + 1, board: util_1.moveUnitOnBoard(state.board, unitId, direction), history: [...state.history, prevState] });
        }
        case 'ATTACK_UNIT': {
            const unitId = action.payload.unitId;
            const target = action.payload.target;
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: ramda_1.clone(state.board),
                action: ramda_1.clone(action)
            };
            // Find nearest dragon unit and reduce its health
            const location = util_1.findUnitInBoard(state.board, unitId);
            if (location != null) {
                for (let i = 0; i < util_1.BOARD_SIZE; i++) {
                    for (let j = 0; j < util_1.BOARD_SIZE; j++) {
                        if (state.board[i][j].type === target && util_1.getDistance(location, [i, j]) <= 2) {
                            const updatedHealth = state.board[i][j].health - state.board[location[0]][location[1]].attack;
                            const affectedUnit = state.board[i][j];
                            state.board[i][j] = updatedHealth <= 0 ? util_1.makeUnit('EMPTY') : Object.assign({}, state.board[i][j], { health: updatedHealth });
                            return Object.assign({}, state, { timestamp: state.timestamp + 1, board: [...state.board], history: [...state.history, prevState] });
                        }
                    }
                }
            }
            return Object.assign({}, state, { history: [...state.history, prevState] });
        }
        case 'HEAL_UNIT': {
            const unitId = action.payload.unitId;
            const prevState = {
                timestamp: state.timestamp,
                prevBoardState: ramda_1.clone(state.board),
                action: ramda_1.clone(action)
            };
            // Find nearest dragon unit and reduce its health
            const location = util_1.findUnitInBoard(state.board, unitId);
            if (location != null) {
                for (let i = 0; i < util_1.BOARD_SIZE; i++) {
                    for (let j = 0; j < util_1.BOARD_SIZE; j++) {
                        if (state.board[i][j].type === 'KNIGHT' &&
                            state.board[i][j].id !== unitId &&
                            util_1.getDistance(location, [i, j]) <= 5) {
                            state.board[i][j].health = Math.min(state.board[i][j].health + state.board[location[0]][location[1]].attack, state.board[i][j].maxHealth);
                            return Object.assign({}, state, { timestamp: state.timestamp + 1, board: [...state.board], history: [...state.history, prevState] });
                        }
                    }
                }
            }
            return Object.assign({}, state, { history: [...state.history, prevState] });
        }
    }
    return state;
}
exports.stateReducer = stateReducer;
