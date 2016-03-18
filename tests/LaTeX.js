var nerdamer = require('../nerdamer.core');
//test latex
var testTex = function(test_cases, verbose, opt) {
    opt = opt || 'tex';
    var result, num_failed = 0, num_tests = 0;
    console.log('Running LaTex tests ... \n------------------------------------ \n');
    for(var test_case in test_cases) {
        num_tests++;
        result = nerdamer(test_case).toTeX(opt);
        
        var expected = test_cases[test_case][opt];
        if(result != expected) {
            num_failed++;
            console.log(test_case+' failed! Expected '+expected+' but received '+result);
        }
        else if(verbose) {
            console.log(test_case+'  passed! Result '+result);
        }
    }
    console.log('Done! '+num_tests+' tests completed');
    console.log(num_failed+' test'+(num_failed === 1 ? '' : 's')+' failed.');
};

var test_cases = {
    '2': {
        tex: '2',
        decimal: '2'
    },
    '1/2': {
        tex: '\\frac{1}{2}',
        decimal: '0.5'
    },
    '2*x': {
        tex: '2 \\cdot x',
        decimal: '2 \\cdot x'
    },
    '2/5*x': {
        tex: '\\frac{2 \\cdot x}{5}',
        decimal: '0.4 \\cdot x'
    },
    '2/5*x^2': {
        tex: '\\frac{2 \\cdot x^{2}}{5}',
        decimal: '0.4 \\cdot x^{2}'
    },
    '1/2*x': {
        tex: '\\frac{x}{2}',
        decimal: '0.5 \\cdot x'
    },
    '1/2*x^2': {
        tex: '\\frac{x^{2}}{2}',
        decimal: '0.5 \\cdot x^{2}'
    },
    '1/2*2^(2/3)': {
        tex: '\\frac{1}{2^{\\frac{1}{3}}}',
        decimal: '0.7937005259840998'
    },
    '2^(2/3)': {
        tex: '2^{\\frac{2}{3}}',
        decimal: '1.5874010519681994'
    },
    '5/8*2^(2/3)*4': {
        tex: '\\frac{5}{2^{\\frac{1}{3}}}',
        decimal: '3.968502629920499'
    },
    '3*x^(2/3)/4': {
        tex: '\\frac{3 \\cdot x^{\\frac{2}{3}}}{4}',
        decimal: '0.75 \\cdot x^{0.6666666666666666}'
    },
    '4*cos(x)': {
        tex: '4 \\cdot \\mathrm{cos}\\left(x\\right)',
        decimal: '4 \\cdot \\mathrm{cos}\\left(x\\right)'
    },
    '(1/4)*cos(x)': {
        tex: '\\frac{\\mathrm{cos}\\left(x\\right)}{4}',
        decimal: '0.25 \\cdot \\mathrm{cos}\\left(x\\right)'
    },
    '(5/4)*cos(x)': {
        tex: '\\frac{5 \\cdot \\mathrm{cos}\\left(x\\right)}{4}',
        decimal: '1.25 \\cdot \\mathrm{cos}\\left(x\\right'
    },
    '7/8*sqrt(x)': {
        tex: '\\frac{7 \\cdot \\sqrt{x}}{8}',
        decimal: '0.875 \\cdot \\sqrt{x}'
    },
    '1/8*sqrt(x+8)': {
        tex: '\\frac{\\sqrt{x+8}}{8}',
        decimal: '0.125 \\cdot \\sqrt{x+8}'
    },
    'x/(x+y)': {
        tex: '\\frac{x}{x+y}',
        decimal: ''
    },
    'x/(x+y)^3': {
        tex: '\\frac{x}{\\left(x+y\\right)^{3}}',
        decimal: ''
    },
    '(x+y)^3/x': {
        tex: '\\frac{\\left(x+y\\right)^{3}}{x}',
        decimal: ''
    },
    '2/(x+y)^3': {
        tex: '\\frac{2}{\\left(x+y\\right)^{3}}',
        decimal: ''
    },
    '2*(x+1)/(x+y)^3': {
        tex: '\\frac{2 \\cdot \\left(x+1\\right)}{\\left(x+y\\right)^{3}}',
        decimal: ''
    },
    '2*(x+1)^2/(x+y)^3': {
        tex: '\\frac{2 \\cdot \\left(x+1\\right)^{2}}{\\left(x+y\\right)^{3}}',
        decimal: '4*cos(x)'
    },
    '(x)^x/(x+1)': {
        tex: '\\frac{x^{x}}{x+1}',
        decimal: ''
    },
    '(3/4)*(x+y)^x/(x+5)^2': {
        tex: '\\frac{3 \\cdot \\left(x+y\\right)^{x}}{4 \\cdot \\left(x+5\\right)^{2}}',
        decimal: ''
    },
    '(3/4)*abs(x+y)^x/(x+5)^2': {
        tex: '\\frac{3 \\cdot \\left|x+y\\right|^{x}}{4 \\cdot \\left(x+5\\right)^{2}}',
        decimal: ''
    },
    
    '-(x^wtf+1)^6-(t+1)/(x+3)^2': {
        tex: '-\\left(x^{wtf}+1\\right)^{6}-\\frac{t+1}{\\left(x+3\\right)^{2}}',
        decimal: ''
    },
    
};
console.log()
console.log('Testing regular output')

testTex(test_cases, true);

console.log()
console.log('Testing decimal output')
testTex(test_cases, true, 'decimal');
