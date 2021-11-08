import {block} from './Utils';

export const ParseDeps = {
    parser: null,
};

export function parse(e, substitutions = {}) {
    return ParseDeps.parser.parse(e, substitutions);
}

/**
 * As the name states. It forces evaluation of the expression
 * @param {Symbol} symbol
 * @param {Symbol} o
 * @deprecated use Utils.evaluate instead
 */
export function evaluate(symbol, o = undefined) {
    return block('PARSE2NUMBER', function () {
        return parse(symbol, o);
    }, true);
}
