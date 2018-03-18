"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameState_1 = require("./GameState");
function server(io) {
    const gameState = GameState_1.GameState.getInstance();
    io.on('connection', (socket) => {
        console.log('---> Got connection from ', socket.id);
        socket.on('disconnect', () => {
            console.log('----> ', socket.id, ' disconnected');
        });
    });
}
exports.server = server;
