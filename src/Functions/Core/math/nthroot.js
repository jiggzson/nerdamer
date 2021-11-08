import {even, isInt} from '../../../Core/Utils';
import {abs} from './abs';
import {Frac} from '../../../Types/Frac';
import {Math2} from '../../Math2';
import {Symbol, symfunction} from '../../../Types/Symbol';
import {UndefinedError} from '../../../Core/Errors';
import {multiply} from '../index';
import {Groups} from '../../../Types/Groups';
import {evaluate, parse} from '../../../Parser/Parser';

/**
 *
 * @param {Symbol} num - the number being raised
 * @param {Symbol} p - the exponent
 * @param {type} prec - the precision wanted
 * @param {bool} asbig - true if a bigDecimal is wanted
 * @returns {Symbol}
 */
export function nthroot(num, p, prec, asbig) {
    //clone p and convert to a number if possible
    p = evaluate(parse(p));

    //cannot calculate if p = 0. nthroot(0, 0) => 0^(1/0) => undefined
    if (p.equals(0)) {
        throw new UndefinedError('Unable to calculate nthroots of zero');
    }

    //Stop computation if it negative and even since we have an imaginary result
    if (num < 0 && even(p))
        throw new Error('Cannot calculate nthroot of negative number for even powers');

    //return non numeric values unevaluated
    if (!num.isConstant(true)) {
        return symfunction('nthroot', arguments);
    }

    //evaluate numeric values
    if (num.group !== Groups.N) {
        num = evaluate(num);
    }

    //default is to return a big value
    if (typeof asbig === 'undefined')
        asbig = true;

    prec = prec || 25;

    var sign = num.sign();
    var ans;

    if (sign < 0) {
        num = abs(num); //remove the sign
    }

    if (isInt(num) && p.isConstant()) {

        if (num < 18446744073709551616) {
            //2^64
            ans = Frac.create(Math.pow(num, 1 / p));
        }
        else {
            ans = Math2.nthroot(num, p);
        }

        var retval;
        if (asbig) {
            // FIXME: unused retval
            retval = new Symbol(ans);
        }
        retval = new Symbol(ans.toDecimal(prec));

        return multiply(new Symbol(sign), retval);
    }
}
