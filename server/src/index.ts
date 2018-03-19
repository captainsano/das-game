import * as express from 'express';
import * as http from 'http';
import * as socketIO from 'socket.io';
import * as cors from 'cors';

import socketServer from './socketServer';

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(cors());

server.listen(8000, () => {
  console.log('----> Server started on port: ', 8000);
});

socketServer(io);