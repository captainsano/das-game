import * as express from 'express'
import * as http from 'http'
import * as socketIO from 'socket.io'
import * as cors from 'cors'

const SERVER_PORT = parseInt(process.env.SERVER_PORT || '8000', 10)
const SYNC_PORT = parseInt(process.env.SYNC_PORT || '5000', 10)

import gameServer from './lib/gameServer'
import { Logger } from './lib/Logger'

const log = Logger.getInstance('Bootstrap')

const createServer = function createServer(name: string, port: number) {
  const app = express()
  const server = http.createServer(app)
  const io = socketIO(server)

  app.use(cors())

  server.listen(port, () => {
    log.info({ server: name, port }, `server started`)
  })

  return io
}

let thisProcess = ''
let masterProcesses = [] as string[]

for (let i = 0; i + 1 < process.argv.length; i++) {
  if (process.argv[i] === '-t') {
    thisProcess = process.argv[i + 1]
  } else if (process.argv[i] === '-m') {
    masterProcesses = process.argv[i + 1].split(",")
  }
}

const clientIo = createServer('Game', SERVER_PORT)
const syncIo = createServer('Sync', SYNC_PORT)

// Wait for sometime to settle other processes start
gameServer(clientIo, syncIo, thisProcess, masterProcesses)
