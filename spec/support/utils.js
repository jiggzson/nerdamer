/* global expect */

var nerdamer = require('../../nerdamer.core.js');

//fix for rounding errors in some functions
var toFixed = function(x, n) {
    return Number(x).toFixed(n||14);
};

/**
 * @param {Array} o An array of object to parse
 * @param {String} dec Get output as decimals
 */
var run = function(o, dec) {
    dec = dec || 'decimal';
    for (var i = 0; i < o.length; ++i) {
        // when
        var parsed = nerdamer(o[i].given);
        var value = parsed.evaluate().text(dec);

        // then
        expect(parsed.toString()).toEqual(o[i].expected);
        expect(value).toEqual(o[i].expectedValue);
    }
};

/**
 * @param {String} e The expression
 * @param {object} subs The substitution object
 */
var parse = function(e, subs) {
    var r = nerdamer(e, subs).evaluate().text('decimals');
    if(!isNaN(r))
        r = Number(r);
    return r;
};

module.exports = {
    run: run,
    toFixed: toFixed,
    parse: parse
};