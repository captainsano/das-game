"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
require("rxjs");
function stateEpic(action$, store) {
    return action$.ofType('EXECUTE')
        .flatMapTo(rxjs_1.Observable.empty());
}
exports.default = stateEpic;
