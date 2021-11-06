const {Math2} = require('./Core/Math2');
/**
 * Restores a previously overridden operator
 * @param {String} what
 */
this.restore = function (what) {
    if (this[what])
        this[what] = bin[what].pop();
};

/**
 * Returns the error function
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
function erf(symbol) {
    var _symbol = evaluate(symbol);

    if (_symbol.isConstant()) {
        return Math2.erf(_symbol);
    }
    else if (_symbol.isImaginary()) {
        return complex.erf(symbol);
    }
    return _.symfunction('erf', arguments);
}