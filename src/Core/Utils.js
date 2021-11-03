/**
 * Rounds a number up to x decimal places
 * @param {Number} x
 * @param {Number} s
 */
const nround = function (x, s) {
    if(isInt(x)) {
        if(x >= Number.MAX_VALUE)
            return x.toString();
        return Number(x);
    }

    s = typeof s === 'undefined' ? 14 : s;
    return Math.round(x * Math.pow(10, s)) / Math.pow(10, s);
};

/**
 * Checks to see if a number is an integer
 * @param {Number} num
 */
const isInt = function (num) {
    return /^[-+]?\d+e?\+?\d*$/gim.test(num.toString());
};

module.exports = { nround, isInt };
