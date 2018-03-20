import * as express from 'express';
import * as http from 'http';
import * as socketIO from 'socket.io';
import * as cors from 'cors';

const SERVER_PORT = parseInt(process.env.SERVER_PORT || '8000', 10);

import socketServer from './socketServer';

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(cors());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

server.listen(SERVER_PORT, () => {
  console.log('----> Server started on port: ', SERVER_PORT);
});


let thisProcess = '';
let masterProcesses = [] as string[];

for (let i = 0; i + 1 < process.argv.length; i++) {
  if (process.argv[i] === '-t') {
    thisProcess = process.argv[i + 1];
  } else if (process.argv[i] === '-m') {
    masterProcesses = process.argv[i + 1].split(",");
  }
}

// Wait for sometime to settle other processes start
setTimeout(() => {
  console.log('---> Starting socket server');
  socketServer(io, thisProcess, masterProcesses);
}, 5000);
