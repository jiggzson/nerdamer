/* Although parens is not a "real" function it is important in some cases when the
 * symbol must carry parenthesis. Once set you don't have to worry about it anymore
 * as the parser will get rid of it at the first opportunity
 */
import {Settings} from '../../../Settings';
import {symfunction} from '../../../Types/Symbol';

export function parens(symbol) {
    if (Settings.PARSE2NUMBER) {
        return symbol;
    }
    return symfunction('parens', [symbol]);
}
