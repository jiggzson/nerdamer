var test = require('./test'),
    settings = require('./settings.js');

var values = {
    x: 2.1,
    y: 3.3,
    z: 1,
    a: 7.42
};

/* CORE tests*/
var cases = { 
    '-a': {
        expected: '-a',
        evaluated_value: -7.42
    },
    '--a': {
        expected: 'a',
        evaluated_value: 7.42
    },
    '(-a)^3': {
        expected: '-a^3',
        evaluated_value: -408.518488
    },
    '-(a)^3': {
        expected: '-a^3',
        evaluated_value: -408.518488
    },
    '--(---a)^3': {
        expected: '-a^3',
        evaluated_value: -408.518488
    },
    '-(a+x)': {
        expected: '-a-x',
        evaluated_value: -9.52
    },
    '-(a+x)^2': {
        expected: '-(a+x)^2',
        evaluated_value: -90.6304
    },
    
};


var report = test('Core', cases, function(expression, report, nerdamer) { 
    var parsed, result;
    try {
        parsed = nerdamer(expression);
    }
    catch(e) {
        parsed = 'error';
    }
    result = parsed.toString();
    
    var passed = result === this.expected;
    if(!passed) {
        report.write('(WARNING!)'); 
        var evaluated_value = nerdamer(result).evaluate(values).text('decimals'),
            second_test_passed = evaluated_value == this.evaluated_value;
        if(second_test_passed) report.write('Although '+expression+' evaluated correctly to '+evaluated_value+' ...');
        else {
            report.write(expression+' evaluated incorrectly to '+evaluated_value+'. Expected '+this.evaluated_value);
        }
    }
    return {
        passed: passed,
        contents: result
    };
}, settings.verbose || settings.core_verbose); 

console.log(report.getReport());
//(1/2)*x^2-2*x+3*(1+x)^(-1)+3*log(1+x)-3*(1+x)^(-1)