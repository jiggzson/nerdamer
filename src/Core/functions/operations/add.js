import {isSymbol, Symbol} from '../../Symbol';
import {err, UndefinedError} from '../../Errors';
import {Settings} from '../../../Settings';
import {Groups} from '../../Groups';
import {text} from '../../Text';
import {even, firstObject} from '../../Utils';
import {isMatrix, Matrix} from '../../../Parser/Matrix';
import {isVector} from '../../../Parser/Vector';
import {sqrt} from '../index';
import {expand} from '../math/expand';

/**
 * Adds two symbols
 * @param {Symbol} a
 * @param {Symbol} b
 * @returns {Symbol}
 */
export function add(a, b) {
    var aIsSymbol = isSymbol(a),
        bIsSymbol = isSymbol(b);
    //we're dealing with two symbols
    if (aIsSymbol && bIsSymbol) {
        //forward the adding of symbols with units to the Unit module
        if (a.unit || b.unit) {
            return deps.Unit.add(a, b);
        }
        //handle Infinity
        //https://www.encyclopediaofmath.org/index.php/Infinity
        if (a.isInfinity || b.isInfinity) {
            var aneg = a.multiplier.lessThan(0),
                bneg = b.multiplier.lessThan(0);

            if (a.isInfinity && b.isInfinity && aneg !== bneg) {
                throw new UndefinedError('(' + a + ')+(' + b + ') is not defined!');
            }

            var inf = Symbol.infinity();
            if (bneg)
                inf.negate();
            return inf;
        }

        if (a.isComposite() && a.isLinear() && b.isComposite() && b.isLinear()) {
            a.distributeMultiplier();
            b.distributeMultiplier();
            // Fix for issue #606
            if (b.length > a.length && a.group === b.group) {
                [a, b] = [b, a];
            }
        }

        //no need to waste time on zeroes
        if (a.multiplier.equals(0))
            return b;
        if (b.multiplier.equals(0))
            return a;

        if (a.isConstant() && b.isConstant() && Settings.PARSE2NUMBER) {
            var result = new Symbol(a.multiplier.add(b.multiplier).toDecimal(Settings.PRECISION));
            return result;
        }

        var g1 = a.group,
            g2 = b.group,
            ap = a.power.toString(),
            bp = b.power.toString();

        //always keep the greater group on the left.
        if (g1 < g2 || (g1 === g2 && ap > bp && bp > 0)) {
            return add(b, a);
        }

        /*note to self: Please don't forget about this dilemma ever again. In this model Groups.PL and Groups.CB goes crazy
         * because it doesn't know which one to prioritize. */
        //correction to Groups.PL dilemma
        if (g1 === Groups.CB && g2 === Groups.PL && a.value === b.value) {
            //swap
            var t = a;
            a = b;
            b = t;
            g1 = a.group;
            g2 = b.group;
            ap = a.power.toString();
            bp = b.power.toString();
        }

        var powEQ = ap === bp,
            v1 = a.value,
            v2 = b.value,
            aIsComposite = a.isComposite(),
            bIsComposite = b.isComposite(),
            h1, h2, result;

        if (aIsComposite)
            h1 = text(a, 'hash');
        if (bIsComposite)
            h2 = text(b, 'hash');

        if (g1 === Groups.CP && g2 === Groups.CP && b.isLinear() && !a.isLinear() && h1 !== h2) {
            return add(b, a);
        }

        //Groups.PL & Groups.PL should compare hashes and not values e.g. compare x+x^2 with x+x^3 and not x with x
        if (g1 === Groups.PL && g2 === Groups.PL) {
            v1 = h1;
            v2 = h2;
        }

        var PN = g1 === Groups.P && g2 === Groups.N,
            PNEQ = a.value === b.multiplier.toString(),
            valEQ = (v1 === v2 || h1 === h2 && h1 !== undefined || (PN && PNEQ));

        //equal values, equal powers
        if (valEQ && powEQ && g1 === g2) {
            //make sure to convert Groups.N to something Groups.P can work with
            if (PN)
                b = b.convert(Groups.P);//CL

            //handle Groups.PL
            if (g1 === Groups.PL && (g2 === Groups.S || g2 === Groups.P)) {
                a.distributeMultiplier();
                result = a.attach(b);
            }
            else {
                result = a;//CL
                if (a.multiplier.isOne() && b.multiplier.isOne() && g1 === Groups.CP && a.isLinear() && b.isLinear()) {
                    for (var s in b.symbols) {
                        var x = b.symbols[s];
                        result.attach(x);
                    }
                }
                else
                    result.multiplier = result.multiplier.add(b.multiplier);
            }
        }
        //equal values uneven powers
        else if (valEQ && g1 !== Groups.PL) {
            //break the tie for e.g. (x+1)+((x+1)^2+(x+1)^3)
            if (g1 === Groups.CP && g2 === Groups.PL) {
                b.insert(a, 'add');
                result = b;
            }
            else {
                result = Symbol.shell(Groups.PL).attach([a, b]);
                //update the hash
                result.value = g1 === Groups.PL ? h1 : v1;
            }
        }
        else if (aIsComposite && a.isLinear()) {
            var canIterate = g1 === g2,
                bothPL = g1 === Groups.PL && g2 === Groups.PL;

            //we can only iterate group Groups.PL if they values match
            if (bothPL)
                canIterate = a.value === b.value;
            //distribute the multiplier over the entire symbol
            a.distributeMultiplier();

            if (b.isComposite() && b.isLinear() && canIterate) {
                b.distributeMultiplier();
                //CL
                for (var s in b.symbols) {
                    var x = b.symbols[s];
                    a.attach(x);
                }
                result = a;
            }
            //handle cases like 2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2
            else if (bothPL && a.value !== h2 || g1 === Groups.PL && !valEQ) {
                result = Symbol.shell(Groups.CP).attach([a, b]);
                result.updateHash();

            }
            else {
                result = a.attach(b);
            }
        }
        else {
            if (g1 === Groups.FN && a.fname === Settings.SQRT && g2 !== Groups.EX && b.power.equals(0.5)) {
                var m = b.multiplier.clone();
                b = sqrt(b.toUnitMultiplier().toLinear());
                b.multiplier = m;
            }
            //fix for issue #3 and #159
            if (a.length === 2 && b.length === 2 && even(a.power) && even(b.power)) {
                result = add(expand(a), expand(b));
            }
            else {
                result = Symbol.shell(Groups.CP).attach([a, b]);
                result.updateHash();
            }
        }

        if (result.multiplier.equals(0))
            result = new Symbol(0);

        //make sure to remove unnecessary wraps
        if (result.length === 1) {
            var m = result.multiplier;
            result = firstObject(result.symbols);
            result.multiplier = result.multiplier.multiply(m);
        }

        return result;
    }
    else {
        //keep symbols to the right
        if (bIsSymbol && !aIsSymbol) {
            var t = a;
            a = b;
            b = t; //swap
            t = bIsSymbol;
            bIsSymbol = aIsSymbol;
            aIsSymbol = t;
        }

        var bIsMatrix = isMatrix(b);

        if (aIsSymbol && bIsMatrix) {
            var M = new Matrix();
            b.eachElement(function (e, i, j) {
                M.set(i, j, add(a.clone(), e));
            });

            b = M
        }
        else {
            if (isMatrix(a) && bIsMatrix) {
                b = a.add(b);
            }
            else if (aIsSymbol && isVector(b)) {
                b.each(function (x, i) {
                    i--;
                    b.elements[i] = add(a.clone(), b.elements[i]);
                });
            }
            else {
                if (isVector(a) && isVector(b)) {
                    b.each(function (x, i) {
                        i--;
                        b.elements[i] = add(a.elements[i], b.elements[i]);
                    });
                }
                else if (isVector(a) && isMatrix(b)) {
                    //try to convert a to a matrix
                    return add(b, a);
                }
                else if (isMatrix(a) && isVector(b)) {
                    if (b.elements.length === a.rows()) {
                        var M = new Matrix(), l = a.cols();
                        b.each(function (e, i) {
                            var row = [];
                            for (var j = 0; j < l; j++) {
                                row.push(add(a.elements[i - 1][j].clone(), e.clone()));
                            }
                            M.elements.push(row);
                        });
                        return M;
                    }
                    else
                        err('Dimensions must match!');
                }
            }
        }
        return b;
    }
}
