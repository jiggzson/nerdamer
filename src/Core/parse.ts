import {block} from './Utils';
import {Parser} from '../Parser/Parser';
import {Symbol} from './Symbol';

type ParseDepsType = {
    parser: Parser | null;
}

export const ParseDeps: ParseDepsType = {
    parser: null
};

export function parse(e: string | Symbol, substitutions = {}) {
    return ParseDeps.parser!.parse(e, substitutions);
}

/**
 * As the name states. It forces evaluation of the expression
 * @param {string} expression
 * @param {Symbol} o
 * @deprecated use Utils.evaluate instead
 */
export function evaluate(expression: string, o = undefined) {
    return block('PARSE2NUMBER', function () {
        return parse(expression, o);
    }, true);
}
