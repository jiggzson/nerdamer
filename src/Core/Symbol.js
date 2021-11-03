const bigDec = require("decimal.js");
const {Settings} = require("../Settings");
const {validateName} = require('./Utils');
const {Groups} = require("./Groups");
const Frac = require('./Frac');

/**
 * All symbols e.g. x, y, z, etc or functions are wrapped in this class. All symbols have a multiplier and a group.
 * All symbols except for "numbers (group N)" have a power.
 * @class Primary data type for the Parser.
 * @param {String} obj
 * @returns {Symbol}
 */
function Symbol(obj) {
    let isInfinity = obj === 'Infinity';
    // This enables the class to be instantiated without the new operator
    if(!(this instanceof Symbol)) {
        return new Symbol(obj);
    }
    // Convert big numbers to a string
    if(obj instanceof bigDec) {
        obj = obj.toString();
    }
    //define numeric symbols
    if(/^(\-?\+?\d+)\.?\d*e?\-?\+?\d*/i.test(obj) || obj instanceof bigDec) {
        this.group = Groups.N;
        this.value = Settings.CONST_HASH;
        this.multiplier = new Frac(obj);
    }
    //define symbolic symbols
    else {
        this.group = Groups.S;
        validateName(obj);
        this.value = obj;
        this.multiplier = new Frac(1);
        this.imaginary = obj === Settings.IMAGINARY;
        this.isInfinity = isInfinity;
    }

    //As of 6.0.0 we switched to infinite precision so all objects have a power
    //Although this is still redundant in constants, it simplifies the logic in
    //other parts so we'll keep it
    this.power = new Frac(1);

    // Added to silence the strict warning.
    return this;
}

module.exports = Symbol;
