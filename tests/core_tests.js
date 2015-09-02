QUnit.module( "nerdamer.core.js" );
QUnit.test( "Constants test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    assert.equal( nerdamer('E').evaluate().valueOf(), 2.718281828459045, "Evaluate constant E" );
    assert.equal( nerdamer('PI').evaluate().valueOf(), 3.141592653589793, "Evaluate constant PI" );
    assert.equal( nerdamer('E',null, 'numer').valueOf(), 2.718281828459045, "numer constant E" );
    assert.equal( nerdamer('PI',null, 'numer').valueOf(), 3.141592653589793, "numer constant PI" );
    nerdamer.setConstant( 'G',1.61803398875 );
    assert.equal( nerdamer('G').valueOf(), 1.61803398875, "Set constant Phi(Golden ratio)" );
    nerdamer.setConstant( 'A',1.20205 );
    assert.equal( nerdamer('A').valueOf(), 1.20205, "Set constant ζ(3)(Apéry's constant)" );
});

QUnit.test( "Set function test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    nerdamer('f(x) = x^2 ');
    assert.equal( nerdamer('f(6)').valueOf(), 36, "f(x) = x^2 ,x=6" );
    nerdamer('hyp(a, b) = sqrt(a^2 + b^2) ');
    assert.equal( nerdamer('hyp(7, 2)').valueOf(), 7.280109889280518, "hyp(a, b) = sqrt(a^2 + b^2),a=7,b=2" );
    nerdamer('g(x,y,z) = y*sin(x)+cos(z)+x^y');
    assert.equal( nerdamer('g(4,3,0)',null, 'numer').valueOf(), 62.72959251407622, "g(x,y,z) = y*sin(x)+cos(z)+x^y,x=4,y=3,z=0" );
    nerdamer('A(x,y,z) =  f(x) + hyp(x,y)*g(x,y,z) ');
    assert.equal( nerdamer('A(-4,1,2)',null, 'numer').valueOf(), 0.9121367605644437, "A(x,y,z) =  f(x) + hyp(x,y)*g(x,y,z),x=-4,y=1,z=2" );
});

QUnit.test( "numer test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    assert.equal( nerdamer('x*PI',{x:2}, 'numer').valueOf(), 6.283185307179586, "x*PI , x=2" );
    assert.equal( nerdamer('x+y',{x:2,y:45}, 'numer').valueOf(), 47, "x+y , x=2,y=45" );
    assert.equal( nerdamer('y*cos(x)',{x:2,y:45}, 'numer').valueOf(), -18.72660764462141, "y*cos(x) , x=2,y=45" );
});

QUnit.test( "buildFunction test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    (function() {
        /*imports*/
        var core = nerdamer.getCore(),
            _ = core.PARSER,
            isNumericSymbol = core.Utils.isNumericSymbol;

        var __ = core.Tests = {
            foobar: function(symbol) {
                if (!isNumericSymbol(symbol))
                {
                    return  _.symfunction("foobar",[symbol]);
                }
                if (symbol == 0)
                {
                    return 1;
                }
                if (symbol == 2)
                {
                    return 3;
                }
                if (symbol == -23)
                {
                    return 8;
                }
                return -8;
            }
        };
        nerdamer.register([
            {
                    name: 'foobar',
                    visible: true,
                    numargs: 1,
                    build: function() { return __.foobar; }
            }
        ]);
    })();
    var f = nerdamer("foobar(x)").buildFunction();
    assert.equal( 8, f(-23), "Inputing -23 into foobar(x)");
    assert.equal( 1, f(0), "Inputing 0 into foobar(x)");
    assert.equal( -8, f(1), "Inputing 1 into foobar(x)");
    assert.equal( 3, f(2), "Inputing 2 into foobar(x)");
    assert.equal( -8, f(5), "Inputing 5 into foobar(x)");
});


QUnit.test( "LaTeX generator test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var test_cases = [
        {
            description: "x+x",
            expression: "x+x",
            nodeexpected: "2~x",
            expected: "2~x"
        },
        {
            description: "a/b",
            expression: "a/b",
            nodeexpected: "\\frac{a}{b}",
            expected: "\\frac{a}{b}"
        },
        {
            description: "2*(x+x^2)+(y+y^2)^6+y",
            expression: "2*(x+x^2)+(y+y^2)^6+y",
            nodeexpected: "{\\left(y+{y}^{2}\\right)}^{6}+2~\\left(x+{x}^{2}\\right)+y",
            expected: "{\\left({y}^{2}+y\\right)}^{6}+2~\\left({x}^{2}+x\\right)+y"
        },
        {
            description: "sqrt(-x)",
            expression: "sqrt(-x)",
            nodeexpected: "\\sqrt{\\left(-x\\right)}",
            expected: "\\sqrt{\\left(-x\\right)}"
        },
        {
            description: "(x+x^6)^y/(a+x^6)^y",
            expression: "(x+x^6)^y/(a+x^6)^y",
            nodeexpected: "\\frac{\\left(x+{x}^{6}\\right)^{y}}{\\left(a+{x}^{6}\\right)^{y}}",
            expected: "\\frac{\\left({x}^{6}+x\\right)^{y}}{\\left(a+{x}^{6}\\right)^{y}}"
        },
        {
            description: "x^(E+2*PI^2)",
            expression: "x^(E+2*PI^2)",
            nodeexpected: "{x}^{{2~\\pi}^{2}+E}",
            expected: "{x}^{{2~\\pi}^{2}+E}"
        },
        {
            description: "x^(E+PIe)",
            expression: "x^(E+PIe)",
            nodeexpected: "{x}^{E+PIe}",
            expected: "{x}^{E+PIe}"
        },
        {
            description: "(x+1)/(x^2 -i)",
            expression: "(x+1)/(x^2 -i)",
            nodeexpected: "\\frac{\\left(1+x\\right)}{\\left(-i+{x}^{2}\\right)}",
            expected: "\\frac{\\left(x+1\\right)}{\\left(-i+{x}^{2}\\right)}"
        },
        {
            description: "(x*x*y)^2/(x+x^2)",
            expression: "(x*x*y)^2/(x+x^2)",
            nodeexpected: "\\frac{{x}^{4}{y}^{2}}{\\left(x+{x}^{2}\\right)}",
            expected: "\\frac{{x}^{4}{y}^{2}}{\\left({x}^{2}+x\\right)}"
        }
    ];

    test_cases.forEach(function (element, index, array) {
        var result = "";
        try {
            //run it through nerdamer
            result = nerdamer(element.expression).latex();
        }
        //Catches errors
        catch(error) {
            result = error.message;
        }
        if (result !== element.expected)
        {
            element.expected = element.nodeexpected;
        }
        assert.equal( result, element.expected, element.description);
    });
    //assert.equal( nerdamer('(x+1)/(x^2 -i)',null,'expand').symbol.latex(), "\\frac{1}{\\left(-i+{x}^{2}\\right)}+\\frac{x}{\\left(-i+{x}^{2}\\right)}", "LaTeX rational expression bug");
});


QUnit.test( "Math functions test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var test_cases = [
        {
            description: "Sine function",
            expression: "sin(x)",
            input: [0,Math.PI/2,Math.PI,2*Math.PI,4,5],
            expected: [0,1,1.2246467991473532e-16,-2.4492935982947064e-16,-0.7568024953079282,-0.9589242746631385]
        },
        {
            description: "Cosine function",
            expression: "cos(x)",
            input: [0,Math.PI/2,Math.PI,2*Math.PI,4,5],
            expected: [1,6.123233995736766e-17,-1,1,-0.6536436208636119,0.28366218546322625]
        },
        {
            description: "Tangent function",
            expression: "tan(x)",
            input: [0,Math.PI/2,Math.PI,2*Math.PI,4,5],
            expected: [0,16331239353195370,-1.2246467991473532e-16,-2.4492935982947064e-16,1.1578212823495777,-3.380515006246586]
        },
        {
            description: "Step function",
            expression: "step(x)",
            input: [-2,-1,0,1,2],
            expected: [0,0,0.5,1,1]
        },
        {
            description: "Sign function",
            expression: "sign(x)",
            input: [-2,-1,0,1,2],
            expected: [-1,-1,0,1,1]
        },
        {
            description: "Rectangle function",
            expression: "rect(x)",
            input: [-1,-0.5,-0.1,0,0.1,0.5,1],
            expected: [0,0.5,1,1,1,0.5,0]
        },
        {
            description: "Sinc function",
            expression: "sinc(x)",
            input: [-Infinity,-2,0,2,Infinity],
            expected: [0,0.45464871341284085,1,0.45464871341284085,0]
        },
        {
            description: "Tri function",
            expression: "tri(x)",
            input: [-2,-1,-0.5,0,0.5,1,2],
            expected: [0,0,0.5,1,0.5,0,0]
        },
        {
            description: "Sin function",
            expression: "tri(x)",
            input: [-2,-1,-0.5,0,0.5,1,2],
            expected: [0,0,0.5,1,0.5,0,0]
        }
    ];

    test_cases.forEach(function (element, index, array) {

        var result = [];
        try {
            //run it through nerdamer
            var f = nerdamer(element.expression).buildFunction();
            result = element.input.map(f);
            //Round
            result.forEach(function (e, i, a) { a[i] = e.toPrecision(15); });
        }
        //Catches errors
        catch(error) {
            result = [];
        }
        element.expected.forEach(function (e, i, a) { a[i] = e.toPrecision(15); });
        assert.deepEqual( result, element.expected, element.description);
    });

});


QUnit.test( "Matrices test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var test_cases = [
        {
            description: "Matrix addition matrix([4])+matrix([3])",
            expression: "matrix([4]) + matrix([3])",
            expected: "matrix([7])"
        },
        {
            description: "Matrix addition matrix([4,5],[1,0])+matrix([3,0],[-1,9])",
            expression: "matrix([4,5],[1,0]) + matrix([3,0],[-1,9])",
            expected: "matrix([7,5],[0,9])"
        },
        {
            description: "Matrix addition matrix([a,b],[c,d]) + matrix([2,3],[-3,8])",
            expression: "matrix([a,b],[c,d]) + matrix([2,3],[-3,8])",
            expected: "matrix([2+a,3+b],[-3+c,8+d])"
        },
        {
            description: "Matrix multiplication 5*matrix([3,0],[-1,9])",
            expression: "5*matrix([3,0],[-1,9])",
            expected: "matrix([15,0],[-5,45])"
        },
        {
            description: "Matrix multiplication matrix([a,b],[c,d])*matrix([1,0],[0,1])",
            expression: "matrix([a,b],[c,d])*matrix([1,0],[0,1])",
            expected: "matrix([a,b],[c,d])"
        },
        {
            description: "Matrix multiplication matrix([4,5],[1,0])*matrix([3,0],[-1,9])",
            expression: "matrix([4,5],[1,0])*matrix([3,0],[-1,9])",
            expected: "matrix([7,45],[3,0])"
        },
        {
            description: "Matrix multiplication matrix([4,5,3],[1,3,0],[2,1,5])*matrix([-3,2,0],[2,-1,9],[3,2,3])",
            expression: "matrix([4,5,3],[1,3,0],[2,1,5])*matrix([-3,2,0],[2,-1,9],[3,2,3])",
            expected: "matrix([7,9,54],[3,-1,27],[11,13,24])"
        }
    ];

    test_cases.forEach(function (element, index, array) {
        var result = "";
        try {
            //run it through nerdamer
            result = nerdamer(element.expression).text();
        }
        //Catches errors
        catch(error) {
            result = error.message;
        }
        assert.equal( result, element.expected, element.description);
    });
});


QUnit.test( "Systems test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var values = {
        x:6,
        y:4,
        z:1,
        t: 0.5,
        r: 4,
        q: 0.2,
        n: 1
    };
    var test_cases = [
        {
            description: "addition N-N",
            expression: "2+3",
            expected: "5",
            numval: 5
        },
        {
            description: "addition N-S",
            expression: "x+5",
            expected: "5+x",
            numval: 11
        },
        {
            description: "addition S-S, same variable",
            expression: "x+x",
            expected: "2*x",
            numval: 12
        },
        {
            description: "addition S-S, different variable",
            expression: "x+y",
            expected: "x+y",
            numval: 10
        },
        {
            description: "addition PL-N/parenthesis",
            expression: "2*(x+x^2)+1",
            expected: "1+2*(x+x^2)",
            numval: 85
        },
        {
            description: "addition PL-PL, power equals 1",
            expression: "2*(x+x^2)+3*(x^2+x^3)",
            expected: "2*x+3*x^3+5*x^2",
            numval: 840
        },
        {
            description: "addition PL-PL/power not equal 1",
            expression: "2*(x+x^2)+3*(x^2+x^3)^2",
            expected: "2*(x+x^2)+3*(x^2+x^3)^2",
            numval: 190596
        },
        {
            description: "addition PL-PL-S/power not equal 1",
            expression: "2*(x+x^2)+3*(x^2+x^3)^2+x",
            expected: "2*x^2+3*x+3*(x^2+x^3)^2",
            numval: 190602
        },
        {
            description: "addition PL-PL-PL/power not equal 1",
            expression: "2*(x+x^2)^2+2*(x+x^2)^3+2*(x+x^2)^2",
            expected: "2*(x+x^2)^3+4*(x+x^2)^2",
            numval: 155232
        },
        {
            description: "addition PL-PL-PL-S/power equal 1 - value not equal",
            expression: "2*(x+x^2)+(y+y^2)+x",
            expected: "2*x^2+3*x+y+y^2",
            numval: 110
        },
        {
            description: "addition PL-PL-PL-S/power equal 1 - value not equal",
            expression: "2*(x+x^2)+(y+y^2)^6+y",
            expected: "(y+y^2)^6+2*(x+x^2)+y",
            numval: 64000088
        },
        {
            description: "addition PL-N",
            expression: "2*(x+x^2)+4",
            expected: "2*(x+x^2)+4",
            numval: 88
        },
        {
            description: "addition PL-CB",
            expression: "2*(x+x^2)+48*x*y",
            expected: "2*(x+x^2)+48*x*y",
            numval: 1236
        },
        {
            description: "addition PL-CP",
            expression: "2*(x+x^2)+(48+x+2*y)",
            expected: "2*x^2+3*x+2*y+48",
            numval: 146
        },
        {
            description: "addition PL-FN",
            expression: "cos(x)+(x+x^2+x)",
            expected: "2*x+x^2+cos(x)",
            numval: 48.96017028665037
        },
        {
            description: "addition CP-FN",
            expression: "cos(x)+(x+x^2+7)",
            expected: "7+cos(x)+x+x^2",
            numval: 49.96017028665037
        },
        {
            description: "addition FN-FN, same function",
            expression: "2*cos(x)+cos(x)",
            expected: "3*cos(x)",
            numval: 2.880510859951098
        },
        {
            description: "addition FN-FN, different function",
            expression: "2*cos(x)+cos(x+8+5*x)",
            expected: "2*cos(x)+cos(6*x+8)",
            numval: 2.9201838819484234
        },
        {
            description: "addition FN-FN+S, different function",
            expression: "x^2+2*cos(x)+cos(x+8+5*x)+4*x^2",
            expected: "2*cos(x)+5*x^2+cos(6*x+8)",
            numval: 182.92018388194842
        },
        {
            description: "subtraction S-S, different variable",
            expression: "x-y",
            expected: "-y+x",
            numval: 2
        },
        {
            description: "subtraction S-S, same variable - reduction to zero",
            expression: "x-x",
            expected: "0",
            numval: 0
        },
        {
            description: "subtraction CP-N, same variable, reduction of symbol",
            expression: "(x^2+1)-1",
            expected: "x^2",
            numval: 36
        },
        {
            description: "subtraction N-CP-CP",
            expression: "5+(x^2+y+1)+(x+y+15)",
            expected: "2*y+21+x+x^2",
            numval: 71
        },
        {
            description: "subtraction CP-CP-CP",
            expression: "(x^2+y+1)+(x+y+15)+(x^2+y+1)",
            expected: "17+2*x^2+x+3*y",
            numval: 107
        },
        {
            description: "subtraction CP-PL",
            expression: "(x^2+y+1)+(x+x^2)",
            expected: "1+2*x^2+x+y",
            numval: 83
        },
        {
            description: "addition CP-N, CP power not equal to 1",
            expression: "(1+(1+x)^2)",
            expected: "(1+x)^2+1",
            numval: 50
        },
        {
            description: "addition EX, addition between parethesis",
            expression: "(x+x)^x",
            expected: "2^x*x^x",
            numval: 2985984
        },
        {
            description: "addition PL with EX. The trailing x should be added to the leading x",
            expression: "x^2+x-x^y+x",
            expected: "-x^y+2*x+x^2",
            numval: -1248
        },
        {
            description: "addition EX with EX to CP with full reduction ot N",
            expression: "x^x+x^x-1-2*x^x",
            expected: "-1",
            numval: -1
        },
        {
            description: "full build up with full reduction to zero",
            expression: "x^x+x^x-1-2*x^x+2*y+1-2*y",
            expected: "0",
            numval: 0
        },
        {
            description: "Build up to CP and reduction of CB",
            expression: "(x+1)-x*y-5+2*x*y",
            expected: "-4+x+x*y",
            numval: 26
        },
        {
            description: "Build up to CP with reduction to N and operations involving group N",
            expression: "(2*x-y+7-x+y-x-5)*2+15/3",
            expected: "9",
            numval: 9
        },
        {
            description: "N times N",
            expression: "6.5*2",
            expected: "13",
            numval: 13
        },
        {
            description: "N times S",
            expression: "x*2",
            expected: "2*x",
            numval: 12
        },
        {
            description: "S times S, same variable",
            expression: "x*x",
            expected: "x^2",
            numval: 36
        },
        {
            description: "S times S, different variable",
            expression: "x*y",
            expected: "x*y",
            numval: 24
        },
        {
            description: "FN times FN",
            expression: "cos(x)*cos(x)",
            expected: "cos(x)^2",
            numval: 0.9219269793662459
        },
        {
            description: "PL times PL",
            expression: "(x+x^2)*(x+x^2)",
            expected: "(x+x^2)^2",
            numval: 1764
        },
        {
            description: "PL times PL times N",
            expression: "(x+x^2)*2*(x+x^2)",
            expected: "2*(x+x^2)^2",
            numval: 3528
        },
        {
            description: "CB times CB same value",
            expression: "(x*y)*(x*y)",
            expected: "(x*y)^2",
            numval: 576
        },
        {
            description: "CB times CB shared variable",
            expression: "(x*y)*(x*z)",
            expected: "x^2*y*z",
            numval: 144
        },
        {
            description: "CP times CP shared variable",
            expression: "(x+y)*(x+y)",
            expected: "(x+y)^2",
            numval: 100
        },
        {
            description: "Recognizing reversed order multiplication CB",
            expression: "(x+y)*(y+x)",
            expected: "(x+y)^2",
            numval: 100
        },
        {
            description: "CB times CB, different values",
            expression: "(x+1)*(y+x)",
            expected: "(1+x)*(x+y)",
            numval: 70
        },
        {
            description: "Finding matching symbols in CB",
            expression: "x*y*x",
            expected: "x^2*y",
            numval: 144
        },
        {
            description: "Reduction of variable within CB",
            expression: "x*y*x/x",
            expected: "x*y",
            numval: 24
        },
        {
            description: "Reduction of variable within CB",
            expression: "x^x*cos(x)*sin(x)/x",
            expected: "cos(x)*sin(x)*x^(-1+x)",
            numval: -2086.195505185691
        },
        {
            description: "PL to EX times S",
            expression: "(x+x^2)^x*x",
            expected: "(x+x^2)^x*x",
            numval: 32934190464
        },
        {
            description: "PL to EX times PL",
            expression: "(x+x^2)^x*(x+x^2)",
            expected: "(x+x^2)*(x+x^2)^x",
            numval: 230539333248
        },
        {
            description: "PL to EX times PL",
            expression: "(x+x^2)^x*(x+x^x)",
            expected: "(x+x^2)^x*(x+x^x)",
            numval: 256129199238528
        },
        {
            description: "PL times PL, non-matching values",
            expression: "(x+x^2)^2*x",
            expected: "(x+x^2)^2*x",
            numval: 10584
        },
        {
            description: "PL to EX times CP",
            expression: "(z+z^2)^x*(x+y^2+1)",
            expected: "(1+x+y^2)*(z+z^2)^x",
            numval: 1472
        },
        {
            description: "FN times FN",
            expression: "tan(x)*tan(x)",
            expected: "tan(x)^2",
            numval: 0.08468460342425725
        },
        {
            description: "FN times FN to CB",
            expression: "y*tan(x)*tan(x)",
            expected: "tan(x)^2*y",
            numval: 0.338738413697029
        },
        {
            description: "FN times FN to CB with reduction to 1",
            expression: "y*tan(x)*tan(x)/y/tan(x)^2",
            expected: "1",
            numval: 1
        },
        {
            description: "CP reduction to 1 by division",
            expression: "(x+1)/(x+1)",
            expected: "1",
            numval: 1
        },
        {
            description: "CB build up with reduction to 1",
            expression: "x*y*z/(x*y*z)",
            expected: "1",
            numval: 1
        },
        {
            description: "EX reduction to 1",
            expression: "x^y/x^y",
            expected: "1",
            numval: 1
        },
        {
            description: "PL to EX reduction to 1",
            expression: "(x+x^6)^y/(x+x^6)^y",
            expected: "1",
            numval: 1
        },
        {
            description: "EX with N base reduction to 1",
            expression: "2^y*2^y",
            expected: "2^(2*y)",
            numval: 256
        },
        {
            description: "N to power N",
            expression: "4^2",
            expected: "16",
            numval: 16
        },
        {
            description: "S to power N",
            expression: "2^x",
            expected: "2^x",
            numval: 64
        },
        {
            description: "S to power N",
            expression: "((x^3+x)^x*(x^2+x)^x+1)*x",
            expected: "((x+x^2)^x*(x+x^3)^x+1)*x",
            numval: 3.9424377028804885e+24
        },
        {
            description: "S to power S",
            expression: "x^x",
            expected: "x^x",
            numval: 46656
        },
        {
            description: "S to the S to the S",
            expression: "y^y^y",
            expected: "y^y^y",
            numval: 1.3407807929942597e+154
        },
        {
            description: "S to the S to the N",
            expression: "y^y^3",
            expected: "y^y^3",
            numval: 3.402823669209385e+38
        },
        {
            description: "square root",
            expression: "sqrt(9)",
            expected: "3",
            numval: 3
        },
        {
            description: "square root, negative number",
            expression: "sqrt(-9)",
            expected: "3*i",
            numval: "3*i"
        },
        {
            description: "retention of sign on even radical",
            expression: "sqrt(-x)",
            expected: "(-x)^0.5",
            numval: "2.449489742783178*i"
        },
        {
            description: "retention of sign on even radical with expansion to negative number Note that the result will contain parenthesis due to the fact that the symbol is wrapped in the parens function.",
            expression: "sqrt(-x)*sqrt(-x)",
            expected: "(-x)",
            numval: -6
        },
        {
            description: "retention of sign on even radical with expansion to negative number and removal of parens",
            expression: "sqrt(-x)*sqrt(-x)+4*x",
            expected: "3*x",
            numval: 18
        },
        {
            description: "retention of absolute value on even radical with integer power",
            expression: "(x^4)^(1/4)",
            expected: "abs(x)",
            numval: 6
        },
        {
            description: "retention of absolute value on even radical under radical",
            expression: "(x^6)^(1/4)",
            expected: "abs(x)^1.5",
            numval: 14.696938456699069
        },
        {
            description: "misc",
            expression: "2*x^4*(1+log(x)^2)-(-x^4)",
            expected: "2*(1+log(x)^2)*x^4+x^4",
            numval: 12209.361972513296
        },
        {
            description: "misc",
            expression: "x/cos(x)*cos(x)",
            expected: "x",
            numval: 6
        },
        {
            description: "misc",
            expression: "x+x+1+x",
            expected: "1+3*x",
            numval: 19
        },
        {
            description: "misc",
            expression: "(-2*x)^2",
            expected: "4*x^2",
            numval: 144
        },
        {
            description: "misc",
            expression: "-4*x^3--x^3+x^2-(-2*x)^2+y",
            expected: "-3*x^2-3*x^3+y",
            numval: -752
        },
        {
            description: "misc",
            expression: "2*x/x",
            expected: "2",
            numval: 2
        },
        {
            description: "addition CP reversed order",
            expression: "(x+1)+(1+x)",
            expected: "2*(1+x)",
            numval: 14
        },
        {
            description: "misc",
            expression: "2*(tan(x)+tan(2*x)+7)-6*tan(x)",
            expected: "-4*tan(x)+14+2*tan(2*x)",
            numval: 13.892304908215836
        },
        {
            description: "Addition FN same function different arguments",
            expression: "2*cos(x)+5*cos(2*x)",
            expected: "2*cos(x)+5*cos(2*x)",
            numval: 6.1396103669631925
        },
        {
            description: "Multiplication FN same function different arguments",
            expression: "2*cos(x)*5*cos(2*x)",
            expected: "10*cos(2*x)*cos(x)",
            numval: 8.102434974472231
        },
        {
            description: "Multiplication FN same function different arguments",
            expression: "(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)",
            expected: "4*(2+y^3)*(y^6*z^8)^(-1)*cos(x)*x^0.5",
            numval: 0.15158906222594418
        },
        {
            description: "Distribution of exponent in CB",
            expression: "(x^2*y)^2",
            expected: "x^4*y^2",
            numval: 20736
        },
        {
            description: "Distribution of exponent in CB with subsequent reduction",
            expression: "(x^2*y)^2/x^4",
            expected: "y^2",
            numval: 16
        },
        {
            description: "CB with non-unit multiplier",
            expression: "((3+y)*2-(cos(x)*4+z))",
            expected: "-4*cos(x)-z+2*y+6",
            numval: 9.159318853398537
        },
        {
            description: "Imaginary multiplication",
            expression: "i*i",
            expected: "-1",
            numval: -1
        },
        {
            description: "Imaginary division",
            expression: "i/i",
            expected: "1",
            numval: 1
        },
        {
            description: "Imaginary reduction through inverse multiplication",
            expression: "(1/i)*i",
            expected: "1",
            numval: 1
        },
        {
            description: "Multiplication FN with EX",
            expression: "cos(x^2)*cos(x^2)^x",
            expected: "cos(x^2)^(1+x)",
            numval: -5.618330413476927e-7
        },
        {
            description: "Multiplication EX with EX",
            expression: "(x+1)^(n+1)*(1+x)^(1+n)",
            expected: "(1+x)^(2*(1+n))",
            numval: 2401
        },
        {
            description: "Multiplication CP with EX",
            expression: "(x+1)^(n+1)*(1+x)^4",
            expected: "(1+x)^(5+n)",
            numval: 117649
        },
        {
            description: "Divide by zero",
            expression: "0/0",
            expected: "Division by zero!",
            numval: Infinity,
            error: true
        },
        {
            description: "Multiples of zero",
            expression: "0^0",
            expected: "Division by zero!",
            numval: Infinity,
            error: true
        },
        {
            description: "Exponent exp(2*x)",
            expression: "exp(2*x)",
            expected: "exp(2*x)",
            numval: 162754.79141900386
        },
        {
            description: "Exponents of negative numbers",
            expression: "(-1)^x",
            expected: "(-1)^x",
            numval: 1
        },
        {
            description: "More exponents of negative numbers",
            expression: "(-5)^(x+y)",
            expected: "(-5)^(x+y)",
            numval: 9765625
        },
        {
            description: "More exponents of complex numbers",
            expression: "(3+i)^(x+y)",
            expected: "(3+i)^(x+y)",
            numval: "(3+i)^10"
        },
        {
            description: "Euler's identity",
            expression: "exp(2*i*PI) +exp(i*PI)",
            expected: "exp(2*PI*i)+exp(PI*i)",
            numval: "-1.2246467991473532e-16*i"
        },
        {
            description: "Math functions",
            expression: "(step(x))^2+4*sign(y)+atan(tri(z))",
            expected: "4*sign(y)+atan(tri(z))+step(x)^2",
            numval: 5
        },
        {
            description: "re(0)",
            expression: "re(0)",
            expected: "re(0)",
            numval: 0
        },
        {
            description: "re(23*i+9+PI*i+sin(x)+tan(y))",
            expression: "re(23*i+9+PI*i+sin(x)+tan(y))",
            expected: "re(23*i+9+PI*i+sin(x)+tan(y))",
            numval: 9.878405784150651
        },
        {
            description: "re(23*i)",
            expression: "re(23*i)",
            expected: "re(23*i)",
            numval: 0
        },
        {
            description: "im(0)",
            expression: "im(0)",
            expected: "im(0)",
            numval: 0
        },
        {
            description: "im(23*i+9+PI*i+sin(x)+tan(y))",
            expression: "im(23*i+9+PI*i+sin(x)+tan(y))",
            expected: "im(23*i+9+PI*i+sin(x)+tan(y))",
            numval: 26.141592653589793
        },
        {
            description: "im(748)",
            expression: "im(748)",
            expected: "im(748)",
            numval: 0
        }
    ];
    var run_tests = function() {
        test_cases.forEach(function(element, index, array) {
            var test_case = element; //get the test case
            var result = "";
            var num_result = Infinity;
            //Test if nerdamer throws and error correctly
            try {
                //run it through nerdamer
                result = nerdamer(test_case.expression).text();
                var num_val = nerdamer(test_case.expression).evaluate(values).valueOf();
                if (typeof num_val === 'string' || num_val instanceof String)
                {
                    num_result = num_val;
                }
                else
                {
                    test_case.numval = test_case.numval.toPrecision(14);
                    num_result = Number(num_val).toPrecision(14);
                }
            }
            //Catches errors
            catch(error) {
                //If an error was expected then save result
                if (test_case.error)
                {
                    result = error.message;
                }
            }

            assert.equal( result, test_case.expected, test_case.description );
            assert.equal( num_result, test_case.numval , test_case.description+" numerical values" );
        });
    };
    run_tests();
});


