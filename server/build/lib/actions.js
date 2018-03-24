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
function addToQueue(timestamp, action) {
    return {
        timestamp,
        type: 'ADD_TO_QUEUE',
        action,
    };
}
exports.addToQueue = addToQueue;
function execute() {
    return {
        type: 'EXECUTE',
    };
}
exports.execute = execute;
