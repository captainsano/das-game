import * as os from 'os'
import { dissoc } from 'ramda'
import { createLogger, INFO, FATAL, LogLevelString } from 'bunyan'
import * as Bunyan from 'bunyan'
import * as PrettyStream from 'bunyan-pretty-stream'

export interface LoggerConfig {
  name: string,
  level: LogLevelString
}

export class Logger {
  private static config: LoggerConfig | null = null
  private static instance: Bunyan

  private constructor() { }

  static configure(config: LoggerConfig) {
    Logger.config = config

    Logger.instance = createLogger({
      name: config.name,
      hostname: os.hostname,
      level: config.level,
    })
  }

  static getInstance(component: string) {
    if (Logger.config) {
      return Logger.instance.child({ component })
    }

    Logger.instance =  createLogger({
      name: 'default',
      hostname: os.hostname,
      level: INFO,
      // streams: [{
      //   level: INFO,
      //   stream: new PrettyStream()
      // }]
    })
    return Logger.instance.child({ component })
  }
}