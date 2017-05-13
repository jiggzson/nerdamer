/*
* Author : Martin Donk
* Website : http://www.nerdamer.com
* Email : martin.r.donk@gmail.com
* Source : https://github.com/jiggzson/nerdamer
*/

if((typeof module) !== 'undefined' && typeof nerdamer === 'undefined') {
    nerdamer = require('./nerdamer.core.js');
    require('./Algebra.js');
}

(function() {
    "use strict";
    
    var core = nerdamer.getCore(),
        _ = core.PARSER,
        Frac = core.Frac,
        isSymbol = core.Utils.isSymbol,
        FN = core.groups.FN,
        Symbol = core.Symbol,
        Matrix = core.Matrix,
        text = core.Utils.text,
        inBrackets = core.Utils.inBrackets,
        isInt = core.Utils.isInt,
        format = core.Utils.format,
        N = core.groups. N,
        S = core.groups.S,
        FN = core.groups.FN,
        PL = core.groups.PL,
        CP = core.groups.CP,
        CB = core.groups.CB,
        EX = core.groups.EX,
        P = core.groups.P,
        LOG = 'log', 
        ABS = 'abs', 
        SQRT = 'sqrt',
        SIN = 'sin',  
        COS = 'cos', 
        TAN = 'tan',
        SEC = 'sec', 
        CSC = 'csc', 
        COT = 'cot',
        ASIN = 'asin', 
        ACOS = 'acos', 
        ATAN = 'atan',
        ASEC = 'asec', 
        ACSC = 'acsc', 
        ACOT = 'acot';
        
    var __ = core.LinearAlgebra = {

        tt: function(n){
            return new Matrix([[1,2], [3,4]]).toString();
        }

    }
    
    nerdamer.register([
        {
            name: 'tt',
            visible: true,
            numargs: 1,
            build: function(){ return __.tt; }
        }
    ]);
    //link registered functions externally
    nerdamer.api();
})();