"use strict";
const visitor_1 = require("./visitor");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    name: 'Typescript',
    transform(ast, options) {
        let visitor = new visitor_1.TypescriptVisitor();
        return Promise.resolve(visitor.parse(ast));
    }
};
