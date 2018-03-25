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
        type: 'ATTACK_UNIT',
        payload: { unitId }
    };
}
exports.healUnit = healUnit;
function addToQueue(timestamp, action) {
    return {
        timestamp,
        type: 'ADD_TO_QUEUE',
        action,
    };
}
exports.addToQueue = addToQueue;
function drainExecuteQueue() {
    return {
        type: 'DRAIN_EXECUTE_QUEUE',
    };
}
exports.drainExecuteQueue = drainExecuteQueue;
