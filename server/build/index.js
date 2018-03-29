"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '8000', 10);
const socketServer_1 = require("./socketServer");
const Logger_1 = require("./Logger");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const log = Logger_1.Logger.getInstance('Server');
app.use(cors());
app.get('/health', (req, res) => {
    res.json({ ok: true });
});
server.listen(SERVER_PORT, () => {
    log.info({ port: SERVER_PORT }, `Server started`);
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
if (!thisProcess) {
    thisProcess = 'localhost:8000';
}
if (masterProcesses.length === 0) {
    masterProcesses = ['localhost:8000'];
}
// Wait for sometime to settle other processes start
setTimeout(() => {
    log.info('Starting socket server');
    socketServer_1.default(io, thisProcess, masterProcesses);
}, 5000);
//# sourceMappingURL=index.js.map