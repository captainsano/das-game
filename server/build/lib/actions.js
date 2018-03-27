"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function spawnUnit(socketId, type) {
    return {
        type: 'SPAWN_UNIT',
        payload: { type, socketId }
    };
}
exports.spawnUnit = spawnUnit;
function removeUnit(socketId) {
    return {
        type: 'REMOVE_UNIT',
        payload: { socketId }
    };
}
exports.removeUnit = removeUnit;
function moveUnit(unitId, direction) {
    return {
        type: 'MOVE_UNIT',
        payload: { unitId, direction }
    };
}
exports.moveUnit = moveUnit;
function attackUnit(unitId, target = 'DRAGON') {
    return {
        type: 'ATTACK_UNIT',
        payload: { unitId, target }
    };
}
exports.attackUnit = attackUnit;
function healUnit(unitId) {
    return {
        type: 'HEAL_UNIT',
        payload: { unitId }
    };
}
exports.healUnit = healUnit;
function setSyncState(connecting, isMaster, masterSocket = null) {
    return {
        type: 'SET_SYNC_STATE',
        payload: { connecting, isMaster, masterSocket }
    };
}
exports.setSyncState = setSyncState;
function addToQueue(timestamp, action) {
    return {
        timestamp,
        type: 'ADD_TO_QUEUE',
        action,
    };
}
exports.addToQueue = addToQueue;
function addToForwardQueue(timestamp, action) {
    return {
        timestamp,
        type: 'ADD_TO_FORWARD_QUEUE',
        action,
    };
}
exports.addToForwardQueue = addToForwardQueue;
function drainExecuteQueue() {
    return {
        type: 'DRAIN_EXECUTE_QUEUE',
    };
}
exports.drainExecuteQueue = drainExecuteQueue;
function drainForwardQueue() {
    return {
        type: 'DRAIN_FORWARD_QUEUE',
    };
}
exports.drainForwardQueue = drainForwardQueue;
function masterServerSync(nextId, timestamp, board, socketIdToUnitId) {
    return {
        type: 'MASTER_SERVER_SYNC',
        payload: {
            nextId,
            timestamp,
            board,
            socketIdToUnitId,
        }
    };
}
exports.masterServerSync = masterServerSync;
function resetState(timestamp, board, history) {
    return {
        type: 'RESET_STATE',
        payload: { timestamp, board, history }
    };
}
exports.resetState = resetState;
