"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
require("rxjs");
const Logger_1 = require("./Logger");
const log = Logger_1.Logger.getInstance('Log');
function loggerEpic(action$, store) {
    return action$
        .do((action) => log.info(action))
        .flatMapTo(rxjs_1.Observable.empty());
}
exports.loggerEpic = loggerEpic;
