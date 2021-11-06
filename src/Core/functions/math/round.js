import {abs} from './abs';
import {Symbol, symfunction} from '../../Symbol';
import {nround} from '../../Utils';
import {multiply, pow} from '../index';

/**
 * Round a number up to s decimal places
 * @param {Symbol} x
 * @param {int} s - the number of decimal places
 * @returns {undefined}
 */
export function round(x, s) {
    var sIsConstant = s && s.isConstant() || typeof s === 'undefined';
    if (x.isConstant() && sIsConstant) {
        var v, e, exp, retval;
        v = x;
        //round the coefficient of then number but not the actual decimal value
        //we know this because a negative number was passed
        if (s && s.lessThan(0)) {
            s = abs(s);
            //convert the number to exponential form
            e = Number(x).toExponential().toString().split('e');
            //point v to the coefficient of then number
            v = e[0];
            //set the expontent
            exp = e[1];
        }
        //round the number to the requested precision
        retval = new Symbol(nround(v, Number(s || 0)));
        //if there's a exponent then put it back
        return multiply(retval, pow(new Symbol(10), new Symbol(exp || 0)))
    }


    return symfunction('round', arguments);
}
