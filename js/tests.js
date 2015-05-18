nerdamer.clear('all');

var tests = function( panel ){
    //predefined values. some values are used because imaginary numbers
    //aren't supported at the time of writing.
    var values = {
        x: 2.84,
        y: 5.73,
        z: -1.31,
        r: 3.44,
        t: 905,
        q: 0.01,
        n: 1
    },
            
    units = {
        1: {
            description: "addition N-N",
            expression: "2+3",
            expected: "5",
            numval: 5
        },
        2: {
            description: "addition N-S",
            expression: 'x+5',
            expected: '5+x',
            numval: 11
        },
        3: {
            description: "addition S-S, same variable",
            expression: 'x+x',
            expected: '2*x',
            numval: 12
        },
        4: {
            description: "addition S-S, different variable",
            expression: 'x+y',
            expected: 'x+y',
            numval: 10
        },
        5: {
            description: "addition PL-N/parenthesis",
            expression: '2*(x+x^2)+1',
            expected: '1+2*(x+x^2)',
            numval: 85
        },
        6: {
            description: "addition PL-PL, power equals 1",
            expression: '2*(x+x^2)+3*(x^2+x^3)',
            expected: '2*x+3*x^3+5*x^2',
            numval: 840
        },
        7: {
            description: "addition PL-PL/power not equal 1",
            expression: '2*(x+x^2)+3*(x^2+x^3)^2',
            expected: '2*(x+x^2)+3*(x^2+x^3)^2',
            numval: 190596
        },
        8: {
            description: "addition PL-PL-S/power not equal 1",
            expression: '2*(x+x^2)+3*(x^2+x^3)^2+x',
            expected: '2*x^2+3*x+3*(x^2+x^3)^2',
            numval: 190602
        },
        9: {
            description: "addition PL-PL-PL/power not equal 1",
            expression: '2*(x+x^2)^2+2*(x+x^2)^3+2*(x+x^2)^2',
            expected: '2*(x+x^2)^3+4*(x+x^2)^2',
            numval: 155232
        },
        10: {
            description: "addition PL-PL-PL-S/power equal 1 - value not equal",
            expression: '2*(x+x^2)+(y+y^2)+x',
            expected: '2*x^2+3*x+y+y^2',
            numval: 110
        },
        11: {
            description: "addition PL-PL-PL-S/power equal 1 - value not equal",
            expression: '2*(x+x^2)+(y+y^2)^6+y',
            expected: '(y+y^2)^6+2*(x+x^2)+y',
            numval: 64000088
        },
        12: {
            description: "addition PL-N",
            expression: '2*(x+x^2)+4',
            expected: '2*(x+x^2)+4',
            numval: 88
        },
        13: {
            description: "addition PL-CB",
            expression: '2*(x+x^2)+48*x*y',
            expected: '2*(x+x^2)+48*x*y',
            numval: 1236
        },
        14: {
            description: "addition PL-CP",
            expression: '2*(x+x^2)+(48+x+2*y)',
            expected: '2*x^2+3*x+2*y+48',
            numval: 146
        },
        15: {
            description: "addition PL-FN",
            expression: 'cos(x)+(x+x^2+x)',
            expected: '2*x+x^2+cos(x)',
            numval: 48.96017028665037
        },
        16: {
            description: "addition CP-FN",
            expression: 'cos(x)+(x+x^2+7)',
            expected: '7+cos(x)+x+x^2',
            numval: 49.96017028665037
        },
        17: {
            description: "addition FN-FN, same function",
            expression: '2*cos(x)+cos(x)',
            expected: '3*cos(x)',
            numval: 2.880510859951098
        },
        18: {
            description: "addition FN-FN, different function",
            expression: '2*cos(x)+cos(x+8+5*x)',
            expected: '2*cos(x)+cos(6*x+8)',
            numval: 2.9201838819484234
        },
        19: {
            description: "addition FN-FN+S, different function",
            expression: 'x^2+2*cos(x)+cos(x+8+5*x)+4*x^2',
            expected: '2*cos(x)+5*x^2+cos(6*x+8)',
            numval: 182.92018388194842
        },
        20: {
            description: "subtraction S-S, different variable",
            expression: 'x-y',
            expected: '-y+x',
            numval: 2
        },
        21: {
            description: "subtraction S-S, same variable - reduction to zero",
            expression: 'x-x',
            expected: '0',
            numval: 0
        },
        22: {
            description: "subtraction CP-N, same variable, reduction of symbol",
            expression: '(x^2+1)-1',
            expected: 'x^2',
            numval: 36
        },
        23: {
            description: "subtraction N-CP-CP",
            expression: '5+(x^2+y+1)+(x+y+15)',
            expected: '2*y+21+x+x^2',
            numval: 71
        },
        24: {
            description: "subtraction CP-CP-CP",
            expression: '(x^2+y+1)+(x+y+15)+(x^2+y+1)',
            expected: '17+2*x^2+x+3*y',
            numval: 107
        },
        25: {
            description: "subtraction CP-PL",
            expression: '(x^2+y+1)+(x+x^2)',
            expected: '1+2*x^2+x+y',
            numval: 83
        },
        26: {
            description: "addition CP-N, CP power not equal to 1",
            expression: '(1+(1+x)^2)',
            expected: '(1+x)^2+1',
            numval: 50
        },
        27: {
            description: "addition EX, addition between parethesis",
            expression: '(x+x)^x',
            expected: '2^x*x^x',
            numval: 2985984
        },
        28: {
            description: "addition PL with EX. The trailing x should be added to the leading x",
            expression: 'x^2+x-x^y+x',
            expected: '-x^y+2*x+x^2',
            numval: -1248
        },
        29: {
            description: "addition EX with EX to CP with full reduction ot N",
            expression: 'x^x+x^x-1-2*x^x',
            expected: '-1',
            numval: -1
        },
        30: {
            description: "full build up with full reduction to zero",
            expression: 'x^x+x^x-1-2*x^x+2*y+1-2*y',
            expected: '0',
            numval: 0
        },
        31: {
            description: "Build up to CP and reduction of CB",
            expression: '(x+1)-x*y-5+2*x*y',
            expected: '-4+x+x*y',
            numval: 26
        },
        32: {
            description: "Build up to CP with reduction to N and operations involving group N",
            expression: '(2*x-y+7-x+y-x-5)*2+15/3',
            expected: '9',
            numval: 9
        },
        33: {
            description: "N times N",
            expression: '6.5*2',
            expected: '13',
            numval: 13
        },
        34: {
            description: "N times S",
            expression: 'x*2',
            expected: '2*x',
            numval: 12
        },
        35: {
            description: "S times S, same variable",
            expression: 'x*x',
            expected: 'x^2',
            numval: 36
        },
        36: {
            description: "S times S, different variable",
            expression: 'x*y',
            expected: 'x*y',
            numval: 24
        },
        37: {
            description: "FN times FN",
            expression: 'cos(x)*cos(x)',
            expected: 'cos(x)^2',
            numval: 0.9219269793662459
        },
        38: {
            description: "PL times PL",
            expression: '(x+x^2)*(x+x^2)',
            expected: '(x+x^2)^2',
            numval: 1764
        },
        39: {
            description: "PL times PL times N",
            expression: '(x+x^2)*2*(x+x^2)',
            expected: '2*(x+x^2)^2',
            numval: 3528
        },
        40: {
            description: "CB times CB same value",
            expression: '(x*y)*(x*y)',
            expected: '(x*y)^2',
            numval: 576
        },
        41: {
            description: "CB times CB shared variable",
            expression: '(x*y)*(x*z)',
            expected: 'x^2*y*z',
            numval: 144
        },
        42: {
            description: "CP times CP shared variable",
            expression: '(x+y)*(x+y)',
            expected: '(x+y)^2',
            numval: 100
        },
        43: {
            description: "Recognizing reversed order multiplication CB",
            expression: '(x+y)*(y+x)',
            expected: '(x+y)^2',
            numval: 100
        },
        44: {
            description: "CB times CB, different values",
            expression: '(x+1)*(y+x)',
            expected: '(1+x)*(x+y)',
            numval: 70
        },
        45: {
            description: "Finding matching symbols in CB",
            expression: 'x*y*x',
            expected: 'x^2*y',
            numval: 144
        },
        46: {
            description: "Reduction of variable within CB",
            expression: 'x*y*x/x',
            expected: 'x*y',
            numval: 24
        },
        47: {
            description: "Reduction of variable within CB",
            expression: 'x^x*cos(x)*sin(x)/x',
            expected: 'cos(x)*sin(x)*x^(-1+x)',
            numval: -2086.195505185691
        },
        48: {
            description: "PL to EX times S",
            expression: '(x+x^2)^x*x',
            expected: '(x+x^2)^x*x',
            numval: 32934190464
        },
        49: {
            description: "PL to EX times PL",
            expression: '(x+x^2)^x*(x+x^2)',
            expected: '(x+x^2)*(x+x^2)^x',
            numval: 230539333248
        },
        50: {
            description: "PL to EX times PL",
            expression: '(x+x^2)^x*(x+x^x)',
            expected: '(x+x^2)^x*(x+x^x)',
            numval: 256129199238528
        },
        51: {
            description: "PL times PL, non-matching values",
            expression: '(x+x^2)^2*x',
            expected: '(x+x^2)^2*x',
            numval: 10584
        },
        52: {
            description: "PL to EX times CP",
            expression: '(z+z^2)^x*(x+y^2+1)',
            expected: '(1+x+y^2)*(z+z^2)^x',
            numval: 1472
        },
        53: {
            description: "FN times FN",
            expression: 'tan(x)*tan(x)',
            expected: 'tan(x)^2',
            numval: 0.08468460342425725
        },
        54: {
            description: "FN times FN to CB",
            expression: 'y*tan(x)*tan(x)',
            expected: 'tan(x)^2*y',
            numval: 0.338738413697029
        },
        55: {
            description: "FN times FN to CB with reduction to 1",
            expression: 'y*tan(x)*tan(x)/y/tan(x)^2',
            expected: '1',
            numval: 1
        },
        56: {
            description: "CP reduction to 1 by division",
            expression: '(x+1)/(x+1)',
            expected: '1',
            numval: 1
        },
        57: {
            description: "CB build up with reduction to 1",
            expression: 'x*y*z/(x*y*z)',
            expected: '1',
            numval: 1
        },
        58: {
            description: "EX reduction to 1",
            expression: 'x^y/x^y',
            expected: '1',
            numval: 1
        },
        59: {
            description: "PL to EX reduction to 1",
            expression: '(x+x^6)^y/(x+x^6)^y',
            expected: '1',
            numval: 1
        },
        60: {
            description: "EX with N base reduction to 1",
            expression: '2^y*2^y',
            expected: '2^(2*y)',
            numval: 256
        },
        61: {
            description: "N to power N",
            expression: '4^2',
            expected: '16',
            numval: 16
        },
        62: {
            description: "S to power N",
            expression: '2^x',
            expected: '2^x',
            numval: 64
        },
        63: {
            description: "S to power N",
            expression: '((x^3+x)^x*(x^2+x)^x+1)*x',
            expected: '((x+x^2)^x*(x+x^3)^x+1)*x',
            numval: 3.9424377028804885e+24
        },
        64: {
            description: "S to power S",
            expression: 'x^x',
            expected: 'x^x',
            numval: 46656
        },
        65: {
            description: "S to the S to the S",
            expression: 'y^y^y',
            expected: 'y^y^y',
            numval: 1.3407807929942597e+154
        },
        66: {
            description: "S to the S to the N",
            expression: 'y^y^3',
            expected: 'y^y^3',
            numval: 3.402823669209385e+38
        },
        67: {
            description: "square root",
            expression: 'sqrt(9)',
            expected: '3',
            numval: 3
        },
        68: {
            description: "square root, negative number",
            expression: 'sqrt(-9)',
            expected: '3*i',
            numval: '3*i'
        },
        69: {
            description: "retention of sign on even radical",
            expression: 'sqrt(-x)',
            expected: '(-x)^0.5',
            numval: '2.449489742783178*i'
        },
        70: {
            description: "retention of sign on even radical with expansion to negative number" +
                         "Note that the result will contain parenthesis due to the fact that the symbol is wrapped" +
                         "in the parens function.",
            expression: 'sqrt(-x)*sqrt(-x)',
            expected: '(-x)',
            numval: -6
        },
        71: {
            description: "retention of sign on even radical with expansion to negative number and removal of parens",
            expression: 'sqrt(-x)*sqrt(-x)+4*x',
            expected: '3*x',
            numval: 18
        },
        72: {
            description: "retention of absolute value on even radical with integer power",
            expression: '(x^4)^(1/4)',
            expected: 'abs(x)',
            numval: 6
        },
        73: {
            description: "retention of absolute value on even radical under radical",
            expression: '(x^6)^(1/4)',
            expected: 'abs(x)^1.5',
            numval: 14.696938456699069
        },
        74: {
            description: "misc",
            expression: '2*x^4*(1+log(x)^2)-(-x^4)',
            expected: '2*(1+log(x)^2)*x^4+x^4',
            numval: 12209.361972513296
        },
        75: {
            description: "misc",
            expression: 'x/cos(x)*cos(x)',
            expected: 'x',
            numval: 6
        },
        76: {
            description: "misc",
            expression: 'x+x+1+x',
            expected: '1+3*x',
            numval: 19
        },

        77: {
            description: "misc",
            expression: '(-2*x)^2',
            expected: '4*x^2',
            numval: 144
        },
        78: {
            description: "misc",
            expression: '-4*x^3--x^3+x^2-(-2*x)^2+y',
            expected: '-3*x^2-3*x^3+y',
            numval: -752
        },
//        79: {
//            description: "misc",
//            expression: '((t^2+x^q^q-q/t+4*r-q+t*(2/3))/t*r+8)-55+t*q^2+z*r',
//            expected: '(-q-q*t^(-1)+0.6666666666666666*t+t^2+4*r+x^q^q)*r*t^(-1)-47+q^2*t+r*z',
//            numval: 114.20087625000356
//        },
        //=============================
        80: {
            description: "misc",
            expression: '2*x/x',
            expected: '2',
            numval: 2
        },
        81: {
            description: "addition CP reversed order",
            expression: '(x+1)+(1+x)',
            expected: '2*(1+x)',
            numval: 14
        },
        82: {
            description: "misc",
            expression: '2*(tan(x)+tan(2*x)+7)-6*tan(x)',
            expected: '-4*tan(x)+14+2*tan(2*x)',
            numval: 13.892304908215836
        },
        83: {
            description: "Addition FN same function different arguments",
            expression: '2*cos(x)+5*cos(2*x)',
            expected: '2*cos(x)+5*cos(2*x)',
            numval: 6.1396103669631925
        },
        84: {
            description: "Multiplication FN same function different arguments",
            expression: '2*cos(x)*5*cos(2*x)',
            expected: '10*cos(2*x)*cos(x)',
            numval: 8.102434974472231
        },
        85: {
            description: "Multiplication FN same function different arguments",
            expression: '(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)',
            expected: '4*(2+y^3)*(y^6*z^8)^(-1)*cos(x)*x^0.5',
            numval: 0.15158906222594418
        },
        86: {
            description: "Distribution of exponent in CB",
            expression: '(x^2*y)^2',
            expected: 'x^4*y^2',
            numval: 20736
        },
        87: {
            description: "Distribution of exponent in CB with subsequent reduction",
            expression: '(x^2*y)^2/x^4',
            expected: 'y^2',
            numval: 16
        },
        88: {
            description: "CB with non-unit multiplier",
            expression: '((3+y)*2-(cos(x)*4+z))',
            expected: '-4*cos(x)-z+2*y+6',
            numval: 9.159318853398537
        },
        89: {
            description: "Imaginary multiplication",
            expression: 'i*i',
            expected: '-1',
            numval: -1
        },
        90: {
            description: "Imaginary division",
            expression: 'i/i',
            expected: '1',
            numval: 1
        },
        91: {
            description: "Imaginary reduction through inverse multiplication",
            expression: '(1/i)*i',
            expected: '1',
            numval: 1
        },
        92: {
            description: "Multiplication FN with EX",
            expression: 'cos(x^2)*cos(x^2)^x',
            expected: 'cos(x^2)^(1+x)',
            numval: -5.618330413476927e-7
        },
        93: {
            description: "Multiplication EX with EX",
            expression: '(x+1)^(n+1)*(1+x)^(1+n)',
            expected: '(1+x)^(2*(1+n))',
            numval: 2401
        },
        94: {
            description: "Multiplication CP with EX",
            expression: '(x+1)^(n+1)*(1+x)^4',
            expected: '(1+x)^(5+n)',
            numval: 117649
        }
    },
    units_values = {
        x:6, 
        y:4, z:1, 
        t: 0.5, 
        r: 4,
        q: 0.2,
        n: 1
    },
    T_ARRAY = [
        //test, value
        ['10-19', '-9', -9],
//        ['expand((x+7+y)^2)-x^2', '-9', 234.3593],
        ['2*x^4*(1+log(x)^2)-(-x^4)','2*log(x)^(2)*x^(4)+3*x^(4)',336.91766531466067],
        ['x/cos(x)*cos(x)', '2.84', 2.84],
        ['x+x+1+x', '3*x+1', 9.52],
        ['(-4*x^3)-(-x)^3+(x^2-(-2*x)^2)+y', '-3*x^(2)-3*x^(3)+y', -87.18571199999998],
        ['((t^2+x^q^q-q/t+4*r-q+t*(2/3))/t*r+8)-55+t*q^2+z*r', '-47-q*r*t^(-1)-q*r*t^(-2)+0.6666666666666666*r+r*t+4*r^(2)*t^(-1)+q^(2)*t+r*t^(-1)*x^(q^(q))+r*z', 3064.1399982070434],
        ['2*x/x', '2', 2],
        ['(x+1)+(1+x)', '2*x+2', 7.68],
        ['sqrt(z^2)', 'abs(z)', 1.31],
        ['sqrt(-1)', 'i', 'i'],
        ['2*(tan(x)+tan(2*x)+7)-6*tan(x)', '-4*tan(x)+14+2*tan(2*x)', 13.866682246130472],
        ['sqrt(z-44*x^2)', '(-44*x^(2)+z)^(0.5)', '18.873166136077963*i'],
        ['(x+x^2)+(x+y)+x^2', '2*x+2*x^(2)+y', 27.5412],
        ['x*z+3*x*y-x*y', '2*x*y+x*z', 28.825999999999997],
        ['x*y+3*x*y', '4*x*y', 65.0928],
        ['x*z+x*y', 'x*z+x*y', 12.5528],
        ['2*(2*x*z+3*x*y)-6*x*y', '4*x*z', -14.8816],//junk removal
        ['2*(2*x*z+3*x*y)-4*x*y', '2*x*y+4*x*z', 17.6648],
        ['(x+x^2)-x+x*z-x*z', 'x^(2)', 8.0656],//cleaning poly
        ['(x+y+z+x^2)*2+y^2+6+y-z', '2*(x+x^(2))+3*y+y^(2)+6+z', 76.5241],
        ['(x+y+7)-(x+y)', '7', 7],//cleaning composite
        ['(x*x*y)^2/(x+x^2)', '(x+x^(2))^(-1)*(x^(2)*y)^(2)', 195.85426786499997],//cleaning composite
        ['(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)', '4*(cos(x)^(-0.5)*x^(-0.25)*y^(1.5)*z^(4))^(-2)+8*(cos(x)^(-0.5)*x^(-0.25)*y^(3)*z^(4))^(-2)', -0.003986752379766627],//cleaning composite
        ['-5*y*sin(5*x)*log( (sec(sqrt(cos(x^(4/5))^2)))/y^2)-(4*y* sin(x^(4/5))*cos(x^(4/5))* cos(5*x)*tan(sqrt(cos(x^(4/5))^2)))/ (5*x^(1/5)*sqrt(cos(x^(4/5))^2))', 
            '-0.8*(abs(cos(x^(0.8)))*x^(0.2))^(-1)*cos(5*x)*cos(x^(0.8))*sin(x^(0.8))*tan(abs(cos(x^(0.8))))*y-5*log(sec(abs(cos(x^(0.8))))*y^(-2))*sin(5*x)*y', 92.73164209109402],//cleaning composite
        ['-2*sec(-2*x+1)^(2)-4*cos(2*x)* sin(2*x)*sin(x)+cos(2*x)^(2) *cos(x)-cos(x)-log(x)^(-2) *tan(2*x)*x^(-1)+2* log(x)^(-1)*sec(2*x)^(2) +0.5*log(2*x)^(-0.5) *x^(-1)+ 4*(-16*x^(2)+1)^(-0.5)', 
            '-2*sec(-2*x+1)^2-4*cos(2*x)*sin(2*x)*sin(x)-cos(x)+-log(x)^(-2)*tan(2*x)*x^(-1)+0.5*log(2*x)^(-0.5)*x^(-1)+2*log(x)^(-1)*sec(2*x)^2+cos(2*x)^2*cos(x)+4*(-16*x^2+1)^(-0.5)', '-0.3534849095255141*i-1903.1170699120116'],
        ['(y^3+2)/(z^4*(y^3/2))^2', '4*(y^(1.5)*z^(4))^(-2)+8*(y^(3)*z^(4))^(-2)', 0.002477526404741476 /*flagged*/],
        ['(x+1+3*(4-7))/(26*4^(-1))', '-1.2307692307692308+0.15384615384615385*x', -0.7938461538461539],
        ['x+x', '2*x', 5.68],
        ['x+x+2*x', '4*x', 11.36],
        ['(x+1)*(1+x)', '(1+x)^(2)', 14.7456],
        ['y^2+cos(x*4)/t', '2*x', 32.833293826276226],
        ['diff(2*cos(x)*log(x),x)', '-2*log(x)*sin(x)+2*cos(x)*x^(-1)', -1.2925458030039765],
        ['diff(tan(x)*log(1/cos(x)),x)', 'cos(x)*cos(x)^(-2)*sin(x)*tan(x)+log(cos(x)^(-1))*sec(x)^(2)', '0.14742731322379868+3.445611212343914*i'],
        ['diff(cos(5*x)*log(sec(sqrt(cos(x^(4/5))^2))/y^2)*y,x)', 
            '-0.8*abs(cos(x^(0.8)))^(-1)*cos(5*x)*cos(x^(0.8))*sin(x^(0.8))*tan(abs(cos(x^(0.8))))*x^(-0.19999999999999996)*y-5*log(sec(abs(cos(x^(0.8))))*y^(-2))*sin(5*x)*y', 92.73164209109405],
        ['diff(cos(2*x),x)','-2*sin(2*x)',1.1345371038579373],
        ['diff(cos(x)*tan(x),x)','-sin(x)*tan(x)+cos(x)*sec(x)^(2)', -0.9548646163796263],
        ['diff(sec(sqrt(cos(x^(4/5))^2)),x)','-0.8*abs(x^(-1))*sec(abs(cos(x^(0.8))))*sin(x^(0.8))*tan(abs(cos(x^(0.8))))*x^(0.8)', 0.4871253490679842],
        ['diff(log(log(log(cos(t*t)^z))),t)','-2*(cos(t^(2))^(-1)*log(cos(t^(2))^(z))^(-1)*log(log(cos(t^(2))^(z)))^(-1)*sin(t^(2))*t*z)^(1)', 6366.2292172747675]
//        ['expand(((3+cos(x)-y)*2 -(cos(x)*4+z+y)-88+z*7+3*cos(x) -14+y+19*z)^2)','-100*y*z-192*cos(x)-4*cos(x)*y-4800*z+625*z^(2)+384*y+4*y^(2)+50*cos(x)*z+9216+cos(x)^(2)', 19927.519002160792]
        
    ],
    n = T_ARRAY.length,
    texeqs = [], //array for storage of latex representation of expression
    texLocation = 1,
    resultLocation = 1; //column
    
    var format_values = function(values, text) {
        text = text || '';
        return '<div class="formatted-values">'+text+'Values used: '+(
                function() {
                    var str = '';
                    for(var x in values) str += '<span>'+x+'='+values[x]+'</span> ';
                    return str;
                }
            )()+'</div>';
    },
    first_values = format_values(values);
    
    for(var x in units) {
        var u = units[x];
        T_ARRAY.push([u.expression, u.expected, u.numval]);
    }
    
    
    function run() {
        
        var l = T_ARRAY.length,
            firstcol = [],
            secondcol = [],
            thirdcol = [],
            i;
        //add all the test expressions into nerdamer.
        for(i=0;i<l;i++) {
            var cureq = T_ARRAY[i][0];
            texeqs.push( nerdamer(cureq).latex() );
            firstcol.push(cureq);
        }        

        var eqs = nerdamer.expressions();
        //column where we want the text to display.
        
        
        //add all the known values into nerdamer.
        //get the second wave
        //evaluate all of the expressions
        for( i=0; i<l; i++) {
            cureq = eqs[i];
            if(i === n) values = units_values;
            secondcol.push( nerdamer( cureq, values, i+1 ).evaluate() );
        }
        
        var expressions = [firstcol,secondcol];
        
        var div = function( item, cls ){
            cls = cls ? 'class="test-item '+cls+'"' : '';
            return '<div '+cls+'>'+item+'</div>';
        };
        
        var numCols = expressions.length,
            contents = 
                first_values+
                '<div class="row test-row">\n\
                    <div class="col-lg-3 test-header">Expression</div>\n\
                    <div class="col-lg-6 test-header">Result</div>\n\
                    <div class="col-lg-2 test-header">Number Value</div>\n\
                    <div class="col-lg-1 test-header">Pass/Fail</div>\n\
                </div>',
            passed = false;
        //build the table
        for( i=0;i<l;i++) { 
            //build the row.
            var row = '<div class="row test-row">';
            for( var j=0; j<numCols; j++ ) {
                var cellData = expressions[j][i].toString();
                //if we're dealing with latex, render it with mathquill.                
                
                var matches;
                if( !isNaN( cellData ) ) {
                    matches = round(cellData, 5) === round(T_ARRAY[i][2], 5);
                }
                else {
                    matches = cellData === T_ARRAY[i][2].toString();
                }
                
                passed = (j === resultLocation && matches );
                if( j === texLocation ) row += div('<span id="tex-'+i+'"><span>', 'col-lg-6');
                //2 for number value column and 3 for expression column
                row += div( cellData, 'col-lg-' +(j===1 ? 2+' result-column' : 3) ); 
                
                if( j === resultLocation ) {
                    row += passed ? div('[pass]','test-pass col-lg-1') : div('[fail]','test-fail span1');
                }
            }
                        
            row += '</div>';
            if(i===n) contents += format_values(units_values,
                '<h4>Additional Tests</h4>');
            //attach the row
            contents += row;
        }
        
        panel.append( contents );
    
        
        //mathquillify and write in the latex
        for( i=0; i<l; i++) { 
            $('<span class="math">$$'+texeqs[i]+'$$</span>')/*.mathquill()*/.appendTo($('#tex-'+i))/*.mathquill('redraw')*/;
        }

        function round(x, s) { 
            return Math.round(x*Math.pow(10,s))/Math.pow(10,s);
        }
        

    }

    run();
    
    return [values, units_values];
};

/*
 * issues: 
 * x/abs(x) renders incorrectly
 */
