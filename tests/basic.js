var test = require('./test');

var values = {
    x: 2.1,
    y: 3.3,
    z: 1,
    a: 7.42
};


var cases = {
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
        number_value: 56.84
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
    '(2)^(1/2)+sqrt(2)': {
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
//    'sqrt(1+x)^(20*x)': {
//        expected: 'x^2',
//        number_value: 4.41
//    },
//    'sqrt(2)^2': {
//        expected: '2',
//        number_value: 2
//    },
};

test(cases, values, true); 
