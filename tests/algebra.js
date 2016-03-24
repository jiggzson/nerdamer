var nerdamer = require('../nerdamer.core.js');
require('../Algebra.js');

var test = function(header, test_cases, f, verbose) {
    var report = {
        REPORT: 'Running tests for '+header+' \n-----------------------------\n',
        write: function(msg) {
            this.REPORT += msg+'\n';
        },
        getReport: function() {
            this.write('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
            this.write(this.num_tests+' tests completed');
            this.write(this.failed+' tests failed');
            return this.REPORT;
        },
        failed: 0,
        num_tests: 0
    };
    
    for(var x in test_cases) {
        report.num_tests++;
        var result = f.call(test_cases[x], x, report);
        if(verbose && result.passed) report.write(x+' passed with result '+result.contents);
        else if(!result.passed) {
            report.failed++;
            report.write(x+' did NOT pass. Expected '+test_cases[x].expected+' but received '+result.contents);
        }
    }
    return report;
};

var test_cases = {
    'gcd(5*x^6+5*x^5+27*x^4+27*x^3+28*x^2+28*x, 5*x^3+7*x)': {
        expected: '5*x^3+7*x'
    },
    'gcd(2*x^2+2*x+1,x+1)': {
        expected: '1'
    },
    'gcd(x^2+2*x+1,x+1)': {
        expected: '1+x'
    },
    'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, (2*x^2+8*x+5))': {
        expected: '2*x^2+8*x+5'
    },
    'gcd(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3))': {
        expected: '3+x^3'
    },
    'gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, x^7+1)': {
        expected: '1+x^7'
    },
    'gcd(1+x^2,2*x)': {
        expected: '1'
    },
    'gcd(84*x^4+147*x^3+16*x^2+28*x, 44*x^5+77*x^4+16*x^3+28*x^2+12*x+21)': {
        expected: '4*x+7'
    },
    'gcd(5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x)': {
        expected: '5*x^5+x'
    },
    'gcd(7*x^4+7*x^3+4*x^2+5*x+1, 21*x^6+47*x^4+80*x^3+20*x^2+49*x+11)': {
        expected: '1+4*x+7*x^3'
    },
};


var report = test('Algebra', test_cases, function(expression, report) {
    var result = nerdamer(expression).toString();
    return {
        passed: this.expected === result,
        contents: result
    };
}, true);

console.log(report.getReport())
