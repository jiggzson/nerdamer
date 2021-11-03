'use strict';

const core = require('../nerdamer.core.js').getCore();

const
    _ = core.PARSER,
    Symbol = core.Symbol,
    CB = core.groups.CB,
    CP = core.groups.CP;

/* nerdamer version 0.7.x and up allows us to make better use of operator overloading
 * As such we can have this data type be supported completely outside of the core.
 * This is an equation that has a left hand side and a right hand side
 */
function Equation(lhs, rhs) {
    if (rhs.isConstant() && lhs.isConstant() && !lhs.equals(rhs) || lhs.equals(core.Settings.IMAGINARY) || rhs.equals(core.Settings.IMAGINARY))
        throw new core.exceptions.NerdamerValueError(lhs.toString() + ' does not equal ' + rhs.toString());
    this.LHS = lhs; //left hand side
    this.RHS = rhs; //right and side
}

//UTILS ##!!

Equation.prototype = {
    toString: function () {
        return this.LHS.toString() + '=' + this.RHS.toString();
    },
    text: function (option) {
        return this.LHS.text(option) + '=' + this.RHS.text(option);
    },
    toLHS: function (expand) {
        expand = typeof expand === 'undefined';
        let eqn;
        if (!expand) {
            eqn = this.clone();
        }
        else {
            eqn = this.removeDenom();
        }
        let a = eqn.LHS;
        let b = eqn.RHS;
        if (a.isConstant(true) && !b.isConstant(true)) {
            // Swap them to avoid confusing parser and cause an infinite loop
            [a, b] = [b, a];
        }
        let _t = _.subtract(a, b);
        return expand ? _.expand(_t) : _t;
    },
    removeDenom: function () {
        let a = this.LHS.clone();
        let b = this.RHS.clone();
        //remove the denominator on both sides
        let den = _.multiply(a.getDenom(), b.getDenom());
        a = _.expand(_.multiply(a, den.clone()));
        b = _.expand(_.multiply(b, den));
        //swap the groups
        if (b.group === CP && b.group !== CP) {
            let t = a;
            a = b;
            b = t; //swap
        }

        //scan to eliminate denominators
        if (a.group === CB) {
            let t = new Symbol(a.multiplier),
                newRHS = b.clone();
            a.each(function (y) {
                if (y.power.lessThan(0))
                    newRHS = _.divide(newRHS, y);
                else
                    t = _.multiply(t, y);
            });
            a = t;
            b = newRHS;

        }
        else if (a.group === CP) {
            //the logic: loop through each and if it has a denominator then multiply it out on both ends
            //and then start over
            for (let x in a.symbols) {
                let sym = a.symbols[x];
                if (sym.group === CB) {
                    for (let y in sym.symbols) {
                        let sym2 = sym.symbols[y];
                        if (sym2.power.lessThan(0)) {
                            return new Equation(
                                _.expand(_.multiply(sym2.clone().toLinear(), a)),
                                _.expand(_.multiply(sym2.clone().toLinear(), b))
                            );
                        }
                    }
                }
            }
        }

        return new Equation(a, b);
    },
    clone: function () {
        return new Equation(this.LHS.clone(), this.RHS.clone());
    },
    sub: function (x, y) {
        let clone = this.clone();
        clone.LHS = clone.LHS.sub(x.clone(), y.clone());
        clone.RHS = clone.RHS.sub(x.clone(), y.clone());
        return clone;
    },
    isZero: function () {
        return core.Utils.evaluate(this.toLHS()).equals(0);
    },
    latex: function (option) {
        return [this.LHS.latex(option), this.RHS.latex(option)].join('=');
    }
};

module.exports = Equation;
