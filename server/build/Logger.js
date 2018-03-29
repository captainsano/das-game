"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const bunyan_1 = require("bunyan");
const PrettyStream = require("bunyan-pretty-stream");
class Logger {
    constructor() { }
    static configure(config) {
        Logger.config = config;
        Logger.instance = bunyan_1.createLogger({
            name: config.name,
            hostname: os.hostname,
            level: config.level,
        });
    }
    static getInstance(component) {
        if (Logger.config) {
            return Logger.instance.child({ component });
        }
        Logger.instance = bunyan_1.createLogger({
            name: 'default',
            hostname: os.hostname,
            streams: [{
                    level: bunyan_1.INFO,
                    stream: new PrettyStream()
                }, {
                    type: 'file',
                    path: `./server-${process.env.SERVER_PORT}.log`,
                    level: bunyan_1.INFO,
                }]
        });
        return Logger.instance.child({ component });
    }
}
Logger.config = null;
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map