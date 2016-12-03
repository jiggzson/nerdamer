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
            report.write('\n(FAILED)');
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
    'x^2+1': {
        expected: true,
        method: 'isPoly'
    },
    '51': {
        expected: true,
        method: 'isPoly'
    },
    '51/x': {
        expected: false,
        method: 'isPoly'
    },
    'x^2+1/x': {
        expected: false,
        method: 'isPoly'
    },
    'y*x^2+1/x': {
        expected: false,
        method: 'isPoly',
        params: [true]
    },
    'y*x^2+x': {
        expected: true,
        method: 'isPoly',
        params: [true]
    },
    '7*y*x^2+z*x+4': {
        expected: true,
        method: 'isPoly',
        params: [true]
    },
    '7*y*x^2+z*x^-1+4': {
        expected: false,
        method: 'isPoly',
        params: [true]
    },
    'sqrt(5*x)+7': {
        expected: false,
        method: 'isPoly',
        params: [true]
    },
    'abs(5*x^3)-x+7': {
        expected: false,
        method: 'isPoly',
        params: [true]
    },
    'abs(5*x^2)-x+11': {
        expected: true,
        method: 'isPoly',
        params: [true],
        note: "Abs gets evaluated right way because it's redundant"
    },
    'cos(x)^2+cos(x)+1': {
        expected: false,
        method: 'isPoly',
        params: [true],
        note: "Abs gets evaluated right way because it's redundant"
    },
    'div(x^2*y^3+b*y^2+3*a*x^2*y+3*a*b, y^2+3*a)': {
        expected: '[b+x^2*y,0]'
    },
    'div(x^2, x^3)': {
        expected: '[0,x^2]'
    },
    'div(cos(x^2)^2+2*cos(x^2)+1, cos(x^2)+1)': {
        expected: '[1+cos(x^2),0]',
        note: 'Division functions'
    },
    'div(2*x^2+2*x+1, x+1)': {
        expected: '[2*x,1]'
    },
    'div(7*x,2*x)': {
        expected: '[7/2,0]'
    },
    
    'div(7*b*z^2+14*y*z+14*a*x^2*z-b*t*z-2*t*y-2*a*t*x^2, 7*z-t)': {
        expected: '[2*a*x^2+2*y+b*z,0]'
    },
    'div(x^2+5, y-1)': {
        expected: '[0,5+x^2]'
    },
    'div(4*a*x^2*y^2+4*a*y^2+b*x^2+a*x^2+b+a, x^2+1)': {
        expected: '[4*a*y^2+a+b,0]'
    },
    'div(4*a*x^2*y^2+4*a*y^2+b*x^2+a*x^2+b+a+u^6+1, x^2+1)': {
        expected: '[4*a*y^2+a+b,1+u^6]'
    },
    'div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x, 3*x^3-5*x-7)': {
        expected: '[2*x^2+5*x^6+x,0]'
    },
    'div(sin(x)^2*tan(x)-4*cos(x)*tan(x)+cos(x)*sin(x)^2-4*cos(x)^2, sin(x)^2-4*cos(x)^2)': {
        expected: '[cos(x)+tan(x),-4*cos(x)*tan(x)-4*cos(x)^2+4*cos(x)^3+4*cos(x)^2*tan(x)]'
    },
    'div(y^2*z-4*x*z+x*y^2-4*x^2, y^2-4*x^2)': {
        expected: '[x+z,-4*x*z-4*x^2+4*x^3+4*x^2*z]'
    },
    'div(-5*y^2+16*a*y+5*x^4+14*a*x^2-3*a^2, 3*a-y+x^2)': {
        expected: '[-a+5*x^2+5*y,0]'
    },
    'div(y^2+2*x*y+x^2,x+y)': {
        expected: '[x+y,0]'
    },
    'div(x*y^2+x^2*y-y-x, x*y-1)': {
        expected: '[x+y,0]'
    },
    'div(y^2*z-4*x*z+x*y^2-4*x^2+x^2, y^2-4*x^2)': { 
        expected: '[x+z,-3*x^2+4*x^3-4*x*z+4*x^2*z]'
    },
    'div(7*x^6*z-a*x*z+28*a*x^6*y^3-4*a^2*x*y^3+7*b*x^6-a*b*x, 4*y^3*a+z+b)': {
        expected: '[-a*x+7*x^6,0]'
    },
    'div(x^2+5, cos(x)-1)': {
        expected: '[0,5+x^2]'
    },
    'div((1+z), t*x+7)': {
        expected: '[0,1+z]'
    },
    'div(-x^2*y-y+4*a*x^2+t+4*a+6*b, x^2+1)': {
        expected: '[-y+4*a,6*b+t]'
    },
    'div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x+y, 3*x^3-5*x-7)': {
        expected: '[2*x^2+5*x^6+x,y]'
    },
    'div(25*x^6*y+10*x^5*y, 5*x^2*y+3-17*x^5)': {
        expected: '[2*x^3+5*x^4,-15*x^4-6*x^3+34*x^8+85*x^9]'
    },
    'div(x^2+2*x+1+u, x+1)': {
        expected: '[1+x,u]'
    },
    'div(y^3+x*y^2+x^2*y+x^3+x, x+y)': {
        expected: '[x^2+y^2,x]'
    },
    'div(b*y*z+7*x^6*z-a*x*z-7*z+4*a*b*y^4+28*a*x^6*y^3-4*a^2*x*y^3-28*a*y^3+b^2*y+7*b*x^6-a*b*x-7*b, 4*y^3*a+z+b)': {
        expected: '[-7-a*x+7*x^6+b*y,0]'
    },
    'div(b*y*z-a*x*z+4*a*b*y^4-4*a^2*x*y^3+b^2*y-a*b*x, 4*y^3*a+z+b)': {
        expected: '[-a*x+b*y,0]'
    },
    'div(17*x^3*y+3*x^2*y+34*x+6, x^2*y+2)': {
        expected: '[17*x+3,0]'
    },
//    'div(-5*x^2+17*x^2*y+4+3*x*y, 2*x^2*y+4)': {
//        expected: '[(3/2)*x^(-1)+17/2,-30-5*x^2-6*x^(-1)]'
//    },
    'div(3*(x^2*y)+5,6*x^2*y+3*x*y+7)': {
        expected: '[(1+2*x)^(-1)*x,(1+2*x)^(-1)*(3*x+5)]'
    },
    
    
};

console.time('elapsed');
var report = test('Algebra', test_cases, function(expression, report) {
    var parsed = nerdamer(expression), result;
    if(this.method) {
        result = parsed.symbol[this.method].apply(parsed.symbol, this.params || []);
    }
    else result = parsed.toString();
    return {
        passed: this.expected === result,
        contents: result
    };
}, false);
console.timeEnd('elapsed');

console.log(report.getReport());