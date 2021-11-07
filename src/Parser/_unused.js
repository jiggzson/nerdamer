const {Math2} = require('./Core/Math2');
const {Settings} = require('../Settings');
const bigInt = require('../3rdparty/bigInt');
/**
 * Restores a previously overridden operator
 * @param {String} what
 */
this.restore = function (what) {
    if (this[what])
        this[what] = bin[what].pop();
};



/**
 * This method gives the ability to override operators with new methods.
 * @param {String} which
 * @param {Function} with_what
 */
this.override = function (which, with_what) {
    if (!bin[which])
        bin[which] = [];
    bin[which].push(this[which]);
    this[which] = with_what;
};

const CUSTOM_OPERATORS = {};

(function () {
    Settings.CACHE.roots = {};
    let x = 40,
        y = 40;
    for (let i = 2; i <= x; i++) {
        for (let j = 2; j <= y; j++) {
            let nthpow = bigInt(i).pow(j);
            Settings.CACHE.roots[nthpow + '-' + j] = i;
        }
    }
})();
