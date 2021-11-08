/// unused code

const {Settings} = require('./Settings');
const bigInt = require('./3rdparty/bigInt');

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
