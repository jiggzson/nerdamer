const Equation = require("./Equation");

module.exports = function(core, solve, variables) {
    const _ = core.PARSER;

    /**
     * Sets two expressions equal
     * @param {Symbol} symbol
     * @returns {Equation | Symbol}
     */
    core.Expression.prototype.equals = function (symbol) {
        if (symbol instanceof core.Expression)
            symbol = symbol.symbol; //grab the symbol if it's an expression
        return new Equation(this.symbol, symbol);
    };

    core.Expression.prototype.solveFor = function (x) {
        let symbol;
        if (this.symbol instanceof Equation) {
            //exit right away if we already have the answer
            //check the LHS
            if (this.symbol.LHS.isConstant() && this.symbol.RHS.equals(x))
                return new core.Expression(this.symbol.LHS);

            //check the RHS
            if (this.symbol.RHS.isConstant() && this.symbol.LHS.equals(x))
                return new core.Expression(this.symbol.RHS);

            //otherwise just bring it to LHS
            symbol = this.symbol.toLHS();
        } else {
            symbol = this.symbol;
        }

        return solve(symbol, x).map(function (x) {
            return new core.Expression(x);
        });
    };

    core.Expression.prototype.expand = function () {
        if (this.symbol instanceof Equation) {
            let clone = this.symbol.clone();
            clone.RHS = _.expand(clone.RHS);
            clone.LHS = _.expand(clone.LHS);
            return new core.Expression(clone);
        }
        return new core.Expression(_.expand(this.symbol));
    };

    core.Expression.prototype.variables = function () {
        if (this.symbol instanceof Equation)
            return core.Utils.arrayUnique(variables(this.symbol.LHS).concat(variables(this.symbol.RHS)));
        return variables(this.symbol);
    };

}