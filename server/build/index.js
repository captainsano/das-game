"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const socketServer_1 = require("./socketServer");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.use(cors());
server.listen(8000, () => {
    console.log('----> Server started on port: ', 8000);
});
socketServer_1.default(io);
