var test = require('./test.js'),
    settings = require('./settings.js');

var cases = {
    '2': {
        TeX: '2',
        decimal_TeX: '2'
    },
    '1/2': {
        TeX: '\\frac{1}{2}',
        decimal_TeX: '0.5'
    },
    '2*x': {
        TeX: '2 \\cdot x',
        decimal_TeX: '2 \\cdot x'
    },
    '2/5*x': {
        TeX: '\\frac{2 \\cdot x}{5}',
        decimal_TeX: '0.4 \\cdot x'
    },
    '2/5*x^2': {
        TeX: '\\frac{2 \\cdot x^{2}}{5}',
        decimal_TeX: '0.4 \\cdot x^{2}'
    },
    '1/2*x': {
        TeX: '\\frac{x}{2}',
        decimal_TeX: '0.5 \\cdot x'
    },
    '1/2*x^2': {
        TeX: '\\frac{x^{2}}{2}',
        decimal_TeX: '0.5 \\cdot x^{2}'
    },
    '1/2*2^(2/3)': {
        TeX: '\\frac{1}{2^{\\frac{1}{3}}}',
        decimal_TeX: '0.7937005259840998'
    },
    '2^(2/3)': {
        TeX: '2^{\\frac{2}{3}}',
        decimal_TeX: '1.5874010519681994'
    },
    '5/8*2^(2/3)*4': {
        TeX: '\\frac{5}{2^{\\frac{1}{3}}}',
        decimal_TeX: '3.968502629920499'
    },
    '3*x^(2/3)/4': {
        TeX: '\\frac{3 \\cdot x^{\\frac{2}{3}}}{4}',
        decimal_TeX: '0.75 \\cdot x^{0.6666666666666666}'
    },
    '4*cos(x)': {
        TeX: '4 \\cdot \\mathrm{cos}\\left(x\\right)',
        decimal_TeX: '4 \\cdot \\mathrm{cos}\\left(x\\right)'
    },
    '(1/4)*cos(x)': {
        TeX: '\\frac{\\mathrm{cos}\\left(x\\right)}{4}',
        decimal_TeX: '0.25 \\cdot \\mathrm{cos}\\left(x\\right)'
    },
    '(5/4)*cos(x)': {
        TeX: '\\frac{5 \\cdot \\mathrm{cos}\\left(x\\right)}{4}',
        decimal_TeX: '1.25 \\cdot \\mathrm{cos}\\left(x\\right)'
    },
    '7/8*sqrt(x)': {
        TeX: '\\frac{7 \\cdot \\sqrt{x}}{8}',
        decimal_TeX: '0.875 \\cdot \\sqrt{x}'
    },
    '1/8*sqrt(x+8)': {
        TeX: '\\frac{\\sqrt{x+8}}{8}',
        decimal_TeX: '0.125 \\cdot \\sqrt{x+8}'
    },
    'x/(x+y)': {
        TeX: '\\frac{x}{x+y}',
        decimal_TeX: '\\frac{x}{x+y}'
    },
    'x/(x+y)^3': {
        TeX: '\\frac{x}{\\left(x+y\\right)^{3}}',
        decimal_TeX: '\\frac{x}{\\left(x+y\\right)^{3}}'
    },
    '(x+y)^3/x': {
        TeX: '\\frac{\\left(x+y\\right)^{3}}{x}',
        decimal_TeX: '\\frac{\\left(x+y\\right)^{3}}{x}'
    },
    '((x+1)*(x+2))/(x+5)': {
        TeX: '\\frac{\\left(x+1\\right) \\cdot \\left(x+2\\right)}{x+5}',
        decimal_TeX: '\\frac{\\left(x+1\\right) \\cdot \\left(x+2\\right)}{x+5}'
    },
    '((x+1)*(x+2)*u)/((x+5)*z)': {
        TeX: '\\frac{\\left(x+1\\right) \\cdot \\left(x+2\\right) \\cdot u}{\\left(x+5\\right) \\cdot z}',
        decimal_TeX: '\\frac{\\left(x+1\\right) \\cdot \\left(x+2\\right) \\cdot u}{\\left(x+5\\right) \\cdot z}'
    },
    '2/(x+y)^3': {
        TeX: '\\frac{2}{\\left(x+y\\right)^{3}}',
        decimal_TeX: '\\frac{2}{\\left(x+y\\right)^{3}}'
    },
    '2*(x+1)/(x+y)^3': {
        TeX: '\\frac{2\\left(x+1\\right)}{\\left(x+y\\right)^{3}}',
        decimal_TeX: '\\frac{2\\left(x+1\\right)}{\\left(x+y\\right)^{3}}'
    },
    '2*(x+1)^2/(x+y)^3': {
        TeX: '\\frac{2 \\cdot \\left(x+1\\right)^{2}}{\\left(x+y\\right)^{3}}',
        decimal_TeX: '\\frac{2 \\cdot \\left(x+1\\right)^{2}}{\\left(x+y\\right)^{3}}'
    },
    '(x)^x/(x+1)': {
        TeX: '\\frac{x^{x}}{x+1}',
        decimal_TeX: '\\frac{x^{x}}{x+1}'
    },
    '(3/4)*(x+y)^x/(x+5)^2': {
        TeX: '\\frac{3 \\cdot \\left(x+y\\right)^{x}}{4 \\cdot \\left(x+5\\right)^{2}}',
        decimal_TeX: '\\frac{0.75 \\cdot \\left(x+y\\right)^{x}}{\\left(x+5\\right)^{2}}'
    },
    '(3/4)*abs(x+y)^x/(x+5)^2': {
        TeX: '\\frac{3 \\cdot \\left|x+y\\right|^{x}}{4 \\cdot \\left(x+5\\right)^{2}}',
        decimal_TeX: '\\frac{0.75 \\cdot \\left|x+y\\right|^{x}}{\\left(x+5\\right)^{2}}'
    },
    'x^(1/4)+3/4*x^2+cos(1/4)': {
        TeX: '\\frac{3 \\cdot x^{2}}{4}+x^{\\frac{1}{4}}+\\mathrm{cos}\\left(\\frac{1}{4}\\right)',
        decimal_TeX: '0.75 \\cdot x^{2}+x^{0.25}+\\mathrm{cos}\\left(0.25\\right)'
    },
    
    '-(x^wtf+1)^6-(t+1)/(x+3)^2': {
        TeX: '-\\left(x^{wtf}+1\\right)^{6}-\\frac{t+1}{\\left(x+3\\right)^{2}}',
        decimal_TeX: '-\\left(x^{wtf}+1\\right)^{6}-\\frac{t+1}{\\left(x+3\\right)^{2}}'
    },
    '2*(-log(x)*sin(x)+cos(x)*x^(-1))': {
        TeX: '2\\left(-\\mathrm{log}\\left(x\\right) \\cdot \\mathrm{sin}\\left(x\\right)+\\frac{\\mathrm{cos}\\left(x\\right)}{x}\\right)',
        decimal_TeX: '2\\left(-\\mathrm{log}\\left(x\\right) \\cdot \\mathrm{sin}\\left(x\\right)+\\frac{\\mathrm{cos}\\left(x\\right)}{x}\\right)'
    },
    '(x*(x+1))/(x^2+2*x+1)': {
        TeX: '\\frac{x \\cdot \\left(x+1\\right)}{x^{2}+2 \\cdot x+1}',
        decimal_TeX: '\\frac{x \\cdot \\left(x+1\\right)}{x^{2}+2 \\cdot x+1}'
    },
    'x^2+2*x+y^2+y+6': {
        TeX: 'x^{2}+2 \\cdot x+y^{2}+y+6',
        decimal_TeX: 'x^{2}+2 \\cdot x+y^{2}+y+6'
    },
    '(-1*(x-1))': {
        TeX: '-\\left(x-1\\right)',
        decimal_TeX: '-\\left(x-1\\right)'
    },
    'x!': {
        TeX: 'x!',
        decimal_TeX: 'x!'
    },
    '(x+1)!': {
        TeX: '\\left(x+1\\right)!',
        decimal_TeX: '\\left(x+1\\right)!'
    },
    'x!+(x+1)!': {
        TeX: '\\left(x+1\\right)!+x!',
        decimal_TeX: '\\left(x+1\\right)!+x!'
    },
};

var report = test('LaTeX', cases, function(expression, report, nerdamer) {
    var TeX = nerdamer(expression).toTeX(),
        decimal_TeX = nerdamer(expression).toTeX('decimal'),
        TeX_passed = TeX === this.TeX,
        decimal_TeX_passed = decimal_TeX === this.decimal_TeX;
    if(!TeX_passed) {
        report.write(expression+' did not get expected result for standard LaTeX. \nExpected '+this.TeX+' but received '+TeX);
    };
    if(!decimal_TeX_passed) {
        report.write(expression+' did not get expected result for LaTeX with decimals. \nExpected '+this.decimal_TeX+' but received '+decimal_TeX);
    };
    return {
        passed: TeX_passed && decimal_TeX_passed
    };
}, settings.verbose || settings.LaTeX_verbose);  

console.log(report.getReport());
