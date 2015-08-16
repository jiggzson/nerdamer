QUnit.module( "nerdamer.core.js" );
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
    console.log(f.toString());
    assert.equal( 8, f(-23), "Inputing -23 into foobar(x)");
    assert.equal( 1, f(0), "Inputing 0 into foobar(x)");
    assert.equal( -8, f(1), "Inputing 1 into foobar(x)");
    assert.equal( 3, f(2), "Inputing 2 into foobar(x)");
    assert.equal( -8, f(5), "Inputing 5 into foobar(x)");
});

QUnit.test( "Math functions test", function( assert ) {
    nerdamer.clear('all'); //make sure that we start fresh
    var test_cases = [
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
            if (element.variables == undefined)
            {
                var f = nerdamer(element.expression).buildFunction();
                result = element.input.map(f);
            }
            else
            {
                var f = nerdamer(element.expression).buildFunction(element.variables);
                result = element.input.map(function(v,i) { return f.apply(null, v); });
            }
        }
        //Catches errors
        catch(error) {
            result = [];
        }
        assert.deepEqual( result, element.expected, element.description);
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
            numval: 0,
            "error": true
        },
        {
            description: "Multiples of zero",
            expression: "0^0",
            expected: "Division by zero!",
            numval: 0,
            "error": true
        },
        {
            description: "Exponents of negative numbers",
            expression: "(-1)^x",
            expected: "(-1)^x",
            numval: 1
        },
        {
            description: "Euler's identity",
            expression: "e^(2*i*PI) +e^(i*PI)",
            expected: "0",
            numval: 0
        },
        {
            description: "Math2 objects",
            expression: "(step(x))^2+4*sign(y)+atan(tri(z))",
            expected: "4*sign(y)+atan(tri(z))+step(x)^2",
            numval: 5
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
                num_result = Number(nerdamer(test_case.expression).evaluate(values).valueOf());
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
            assert.equal( num_result, test_case.numval, test_case.description+" numerical values" );
        });
    };
    run_tests();
});


