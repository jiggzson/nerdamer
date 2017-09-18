/*
 * Author : Martin Donk
 * Website : http://www.nerdamer.com
 * Email : martin.r.donk@gmail.com
 * Source : https://github.com/jiggzson/nerdamer
 * Can be used to load all add-ons with one require
 */

var nerdamer = require('./nerdamer.core.js');
require('./Algebra.js');
require('./Calculus.js');
require('./Solve.js');
require('./Extra.js');

//export nerdamer
module.exports = nerdamer;



//var x = nerdamer('pfactor(100!)');
//var x = nerdamer('pfactor(25563987313)');
var x = nerdamer('pfactor(93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000)');
console.log(x.text())

var x = nerdamer('(x/(x+y))^n');
console.log(x.toString());