"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '8000', 10);
const gameServer_1 = require("./lib/gameServer");
const Logger_1 = require("./lib/Logger");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.use(cors());
app.get('/health', (req, res) => {
    res.json({ ok: true });
});
server.listen(SERVER_PORT, () => {
    Logger_1.Logger.getInstance('server').info({ port: SERVER_PORT }, `Listening on port ${SERVER_PORT}`);
});
let thisProcess = '';
let masterProcesses = [];
for (let i = 0; i + 1 < process.argv.length; i++) {
    if (process.argv[i] === '-t') {
        thisProcess = process.argv[i + 1];
    }
    else if (process.argv[i] === '-m') {
        masterProcesses = process.argv[i + 1].split(",");
    }
}
// Wait for sometime to settle other processes start
gameServer_1.default(io, thisProcess, masterProcesses);
