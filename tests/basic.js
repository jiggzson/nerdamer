var test = require('./test');

var values = {
    x: 2.1,
    y: 3.3,
    z: 1,
    a: 7.42
};

var cases = {
    '((((((1+1))))))': {
        expected: '2',
        number_value: 2
    },
    '((((((1+1))+4)))+3)': {
        expected: '9',
        number_value: 9
    },
    '1+1': {
        expected: '2',
        number_value: 2
    },
    '2+(3/4)': {
        expected: '11/4',
        number_value: 2.75
    },
    '2/3+2/3': {
        expected: '4/3',
        number_value: 1.3333333333333333
    },
    'x+x': {
        expected: '2*x',
        number_value: 4.2
    },
    'x+1': {
        expected: '1+x',
        number_value: 3.1
    },
    'x+y': {
        expected: 'x+y',
        number_value: 5.2
    },
    '(x+1)+(1+x)': {
        expected: '2*(1+x)',
        number_value: 6.2
    },
    '(x+y)+(a+x)': {
        expected: '2*x+a+y',
        number_value: 14.92
    },
    '7*(x+y)+2*(a+x)': { //
        expected: '2*a+7*y+9*x',
        number_value: 56.84,
        note: 'This test is a huge compromise. Do I expand as much as possible or '+
                     'do I simplify only at the highest level?'
    },
    '(x+x^2)+x': {
        expected: '2*x+x^2',
        number_value: 8.61
    },
    '(x+1)+4': {
        expected: '5+x',
        number_value: 7.1
    },
    '(x+1)+(8+y)': {
        expected: '9+x+y',
        number_value: 14.4
    },
    '(x+1)+(a+y)': {
        expected: '1+a+x+y',
        number_value: 13.82
    },
    '(x+x^2)+(x^3+x)': {
        expected: '2*x+x^2+x^3',
        number_value: 17.871
    },
    '3*(x+x^2)+5*(x^3+x)': {
        expected: '3*x^2+5*x^3+8*x',
        number_value: 76.335
    },
    'x^y+x^y': {
        expected: '2*x^y',
        number_value: 23.13948390048293
    },
    //power
    '2^(1/2)': {
        expected: 'sqrt(2)',
        number_value: 23.13948390048293
    },
    '(2/5)^(1/2)': {
        expected: 'sqrt(2)*sqrt(5)^(-1)',
        number_value: 0.6324555320336759
    },
    '2^(1/2)+sqrt(2)': {
        expected: '2*sqrt(2)',
        number_value: 2.8284271247461903
    },
    'sqrt(2)*sqrt(2)': {
        expected: '2',
        number_value: 2
    },
    'x*x': {
        expected: 'x^2',
        number_value: 4.41
    },
    'sqrt(1/2)': {
        expected: 'sqrt(2)^(-1)',
        number_value: 0.7071067811865476
    },
    'sqrt(1+x)^(4*x)': {
        expected: '(1+x)^(2*x)',
        number_value: 115.80281433592612
    },
    'sqrt(2)^2': {
        expected: '2',
        number_value: 2
    },
    '6*sqrt(2)^4': {
        expected: '24',
        number_value: 24
    },
    'sqrt(x^2)*sqrt(x^4)': {
        expected: 'abs(x)*x^2',
        number_value: 9.261
    },
    'sqrt((5/2)*x^10)': {
        expected: 'abs(x)*sqrt(2)^(-1)*sqrt(5)*x^4',
        number_value: 2637.3207495816264
    },
    '(sqrt((5/2)*x^10))*-sqrt(2)': {
        expected: '-abs(x)*sqrt(5)*x^4',
        number_value: -91.3232746297487,
        note: 'The function is supposed to contain a sqrt(2) which has to be removed but retain the sign'
    },
    'y*tan(x)*tan(x)': {
        expected: 'tan(x)^2*y',
        number_value: 9.647798160932233
    },
    '(x+x^2)*(x+x^2)^x': {
        expected: '(x+x^2)^(1+x)',
        number_value: 332.7369754244108
    },
    '2*(1+x)*3*(z+x)^x*8': {
        expected: '48*(1+x)*(x+z)^x',
        number_value: 1601.2623349876335
    },
    '(x+1)^x*(z+1)^z*(x+1)': {
        expected: '(1+x)^(1+x)*(1+z)^z',
        number_value: 66.71926395781806
    },
    '2*cos(x)+cos(x)': {
        expected: '3*cos(x)',
        number_value: -1.5145383137995727
    },
    '2*cos(x)+cos(x+8+5*x)': {
        expected: '2*cos(x)+cos(6*x+8)',
        number_value: 0.18041483808986802
    },
    'x^2+2*cos(x)+cos(x+8+5*x)+4*x^2': {
        expected: '2*cos(x)+5*x^2+cos(6*x+8)',
        number_value: 22.230414838089867
    },
    'x-y': {
        expected: '-y+x',
        number_value: 1.1999999999999997
    },
    'x-x': {
        expected: '0',
        number_value: 0
    },
    
};

test(cases, values, true); 
