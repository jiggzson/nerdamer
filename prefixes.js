var nerdamer = require('./nerdamer.core');

var cases = {
    '0-4': {
        expected: '-4'
    },
    '-(4)': {
        expected: '-4'
    },
    '3*-(4)': {
        expected: '-12'
    },
    '-3*-(4)': {
        expected: '12'
    },
    '-(3*-(4))': {
        expected: '12'
    },
    '-(-3*-(4))': {
        expected: '-12'
    },
    '-(3)-3': {
        expected: '-6'
    },
    '3^-1^-1': {
        expected: '1/3'
    },
    '-1': {
        expected: '-1'
    },
    '--1': {
        expected: '1'
    },
    '8-1': {
        expected: '7'
    },
    '(-1)': {
        expected: '-1'
    },
    '-(1)-1': {
        expected: '-2'
    },
    '-(-1-1)': {
        expected: '2'
    },
    '-(-1-+1)^2': {
        expected: '-4'
    },
    '-(-1-1+1)': {
        expected: '1'
    },
    '-(1)--(1-1--1)': {
        expected: '0'
    },
    '-(-(1))-(--1)': {
        expected: '0'
    },
    '5^-3': {
        expected: '1/125'
    },
    '5^---3': {
        expected: '1/125'
    },
    '5^-(1--2)': {
        expected: '1/125'
    },
    '5^-(++1+--+2)': {
        expected: '1/125'
    },
    '(5^-(++1+--+2))^-2': {
        expected: '15625'
    },
    '(5^-3^2)': {
        expected: '1/1953125'
    },
    '(5^-3^-2)': {
        expected: '5^(-1/9)'
    },
    '-(5^-3^-2)^-3': {
        expected: '-5^(1/3)'
    },
    '-(--5*--7)': {
        expected: '-35'
    },
};
for(var x in cases) {
    var c = cases[x];
    var received = nerdamer(x).toString();
    if(received !== c.expected)
        console.log(x+' failed! Expected '+c.expected+' but received '+received);
}