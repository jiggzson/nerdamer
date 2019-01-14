'use strict';
exports.__esModule = true;
var nerdamer = require('../nerdamer.core');
// The module 'assert' provides assertion methods from node
var assert = require('assert');

describe('Nerdamer supported functions', () => {
    context('Triganometry', () => {
        it('sin, cos, tan', () => {
            assert.equal('\\sin\\left(x\\right)', nerdamer.convertFromLaTeX('\\sin(x)').toTeX());
            assert.equal('\\cos\\left(x\\right)', nerdamer.convertFromLaTeX('\\cos(x)').toTeX());
            assert.equal('\\tan\\left(x\\right)', nerdamer.convertFromLaTeX('\\tan(x)').toTeX());
        });

        it('cot, sec, csc', () => {
            assert.equal('\\cot\\left(x\\right)', nerdamer.convertFromLaTeX('\\cot(x)').toTeX());
            assert.equal('\\sec\\left(x\\right)', nerdamer.convertFromLaTeX('\\sec(x)').toTeX());
            assert.equal('\\csc\\left(x\\right)', nerdamer.convertFromLaTeX('\\csc(x)').toTeX());
        });
        it('arcsin, arccos, arctan', () => {
            assert.equal('\\arcsin\\left(x\\right)', nerdamer.convertFromLaTeX('\\arcsin(x)').toTeX());
            assert.equal('\\arccos\\left(x\\right)', nerdamer.convertFromLaTeX('\\arccos(x)').toTeX());
            assert.equal('\\arctan\\left(x\\right)', nerdamer.convertFromLaTeX('\\arctan(x)').toTeX());
        });
        it('sinh, cosh, tanh', () => {
            assert.equal('\\sinh\\left(x\\right)', nerdamer.convertFromLaTeX('\\sinh(x)').toTeX());
            assert.equal('\\cosh\\left(x\\right)', nerdamer.convertFromLaTeX('\\cosh(x)').toTeX());
            assert.equal('\\tanh\\left(x\\right)', nerdamer.convertFromLaTeX('\\tanh(x)').toTeX());
        });
        it('coth, sech, ,csch', () => {
            assert.equal('\\coth\\left(x\\right)', nerdamer.convertFromLaTeX('\\coth(x)').toTeX());
            assert.equal('\\sech\\left(x\\right)', nerdamer.convertFromLaTeX('\\sech(x)').toTeX());
            assert.equal('\\csch\\left(x\\right)', nerdamer.convertFromLaTeX('\\csch(x)').toTeX());
        });
        it('sin of pi/2', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\sin(\\pi/2)').toTeX());
        });
        it('sin of 90deg', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\sin(90\\deg)').toTeX());
        });
    });
    context('Logs', () => {
        it('log()', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\log(e)').toTeX());
        });
        it('log', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\log e').toTeX());
        });
        it('ln', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\ln(e)').toTeX());
        });
        it('log_2', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\log_2(2)').toTeX());
        });
        it('log_{10}', () => {
            assert.equal("1", nerdamer.convertFromLaTeX('\\log_{10}(10)').toTeX());
        });
    });
    context('Roots', () => {
        it('square root', () => {
            assert.equal("2", nerdamer.convertFromLaTeX('\\sqrt{4}').toTeX());
            assert.equal("\\sqrt{5}", nerdamer.convertFromLaTeX('\\sqrt{5}').toTeX());
        });
        it('cube root', () => {
            assert.equal("2", nerdamer.convertFromLaTeX('\\sqrt[3]{8}').toTeX());
            assert.equal("\\sqrt[3]{5}", nerdamer.convertFromLaTeX('\\sqrt[3]{5}').toTeX());
        });
        it('nth root', () => {
            assert.equal("\\sqrt[n]{2}", nerdamer.convertFromLaTeX('\\sqrt[n]{2}').toTeX());
        });
        it('nth root of 2^n', () => {
            assert.equal("2", nerdamer.convertFromLaTeX('\\sqrt[n]{2^n}').toTeX());
        });
    });
    it('Greek letters', () => {
        assert.equal('\\alpha', nerdamer.convertFromLaTeX('\\alpha').toTeX());
        assert.equal('\\theta', nerdamer.convertFromLaTeX('\\theta').toTeX());
        assert.equal('\\tau', nerdamer.convertFromLaTeX('\\tau').toTeX());
        assert.equal('\\beta', nerdamer.convertFromLaTeX('\\beta').toTeX());
        assert.equal('\\pi', nerdamer.convertFromLaTeX('\\pi').toTeX());
        assert.equal('\\upsilon', nerdamer.convertFromLaTeX('\\upsilon').toTeX());
        assert.equal('\\gamma', nerdamer.convertFromLaTeX('\\gamma').toTeX());
        assert.equal('\\gamma', nerdamer.convertFromLaTeX('\\gamma').toTeX());
        assert.equal('\\phi', nerdamer.convertFromLaTeX('\\phi').toTeX());
        assert.equal('\\delta', nerdamer.convertFromLaTeX('\\delta').toTeX());
        assert.equal('\\kappa', nerdamer.convertFromLaTeX('\\kappa').toTeX());
        assert.equal('\\rho', nerdamer.convertFromLaTeX('\\rho').toTeX());
        assert.equal('\\epsilon', nerdamer.convertFromLaTeX('\\epsilon').toTeX());
        assert.equal('\\lambda', nerdamer.convertFromLaTeX('\\lambda').toTeX());
        assert.equal('\\chi', nerdamer.convertFromLaTeX('\\chi').toTeX());
        assert.equal('\\mu', nerdamer.convertFromLaTeX('\\mu').toTeX());
        assert.equal('\\sigma', nerdamer.convertFromLaTeX('\\sigma').toTeX());
        assert.equal('\\psi', nerdamer.convertFromLaTeX('\\psi').toTeX());
        assert.equal('\\zeta', nerdamer.convertFromLaTeX('\\zeta').toTeX());
        assert.equal('\\nu', nerdamer.convertFromLaTeX('\\nu').toTeX());
        assert.equal('\\omega', nerdamer.convertFromLaTeX('\\omega').toTeX());
        assert.equal('\\eta', nerdamer.convertFromLaTeX('\\eta').toTeX());
        assert.equal('\\xi', nerdamer.convertFromLaTeX('\\xi').toTeX());
        assert.equal('\\Gamma', nerdamer.convertFromLaTeX('\\Gamma').toTeX());
        assert.equal('\\Lambda', nerdamer.convertFromLaTeX('\\Lambda').toTeX());
        assert.equal('\\Sigma', nerdamer.convertFromLaTeX('\\Sigma').toTeX());
        assert.equal('\\Psi', nerdamer.convertFromLaTeX('\\Psi').toTeX());
        assert.equal('\\Delta', nerdamer.convertFromLaTeX('\\Delta').toTeX());
        assert.equal('\\Xi', nerdamer.convertFromLaTeX('\\Xi').toTeX());
        assert.equal('\\Upsilon', nerdamer.convertFromLaTeX('\\Upsilon').toTeX());
        assert.equal('\\Omega', nerdamer.convertFromLaTeX('\\Omega').toTeX());
        assert.equal('\\Theta', nerdamer.convertFromLaTeX('\\Theta').toTeX());
        assert.equal('\\Pi', nerdamer.convertFromLaTeX('\\Pi').toTeX());
        assert.equal('\\Phi', nerdamer.convertFromLaTeX('\\Phi').toTeX());
    });
    it('Greek letter variants', () => {
        assert.equal('\\vartheta', nerdamer.convertFromLaTeX('\\vartheta').toTeX());
        assert.equal('\\varpi', nerdamer.convertFromLaTeX('\\varpi').toTeX());
        assert.equal('\\varphi', nerdamer.convertFromLaTeX('\\varphi').toTeX());
        assert.equal('\\varrho', nerdamer.convertFromLaTeX('\\varrho').toTeX());
        assert.equal('\\varepsilon', nerdamer.convertFromLaTeX('\\varepsilon').toTeX());
        assert.equal('\\varsigma', nerdamer.convertFromLaTeX('\\varsigma').toTeX());
    });
});

describe('Basic Operators', () => {
    context('Basic Operations', () => {
        it('Addition', () => {
            assert.equal('4', nerdamer.convertFromLaTeX('2 + 2').toTeX());
        });
        it('Subtraction', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('3 - 1').toTeX());
            assert.equal('2', nerdamer.convertFromLaTeX('1 - -1').toTeX());
        });
        describe('Multiplication', () => {
            it('\\cdot', () => {
                assert.equal('6', nerdamer.convertFromLaTeX('2 \\cdot 3').toTeX());
            });
            it('\\times', () => {
                assert.equal('6', nerdamer.convertFromLaTeX('2 \\times 3').toTeX());
            });
        });
        describe('Division', () => {
            it('\\frac', () => {
                assert.equal('3', nerdamer.convertFromLaTeX('\\frac{6}{2}').toTeX());
            });
            it('Division Symbol', () => {
                assert.equal('3', nerdamer.convertFromLaTeX('6 \\div 2').toTeX());
            });
            it('Slash', () => {
                assert.equal('2', nerdamer.convertFromLaTeX('6/3').toTeX());
            });
            it('Nested fractions', () => {
                assert.equal('1', nerdamer.convertFromLaTeX('\\frac{\\frac{\\frac{7}{4}}{2\\frac{7}{3}}}{\\frac{6}{16}}').toTeX());
            });
            it('Display Fraction', () => {
                assert.equal('3', nerdamer.convertFromLaTeX('\\dfrac{6}{2}').toTeX());
            });
        });
        it('Exponents', () => {
            assert.equal('8', nerdamer.convertFromLaTeX('2^3').toTeX());
            assert.equal('8', nerdamer.convertFromLaTeX('2^{3}').toTeX());
            assert.equal('8', nerdamer.convertFromLaTeX('{2}^{3}').toTeX());
        });
    });

    context('Brackets', () => {
        describe('Parenthesies', () => {
            it('Simple Brackets', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2(1+1)').toTeX());
            });
            it('\\left and \\right', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\left(1+1\\right)').toTeX());
            });
            it('\\big', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\big(1+1\\big)').toTeX());
            });
            it('\\bigg', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\bigg(1+1\\bigg)').toTeX());
            });
            it('\\Big', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\Big(1+1\\Big)').toTeX());
            });
            it('\\Bigg', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\Bigg(1+1\\Bigg)').toTeX());
            });
        });
        describe('Square Brackets', () => {
            it('Simple Brackets', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2[1+1]').toTeX());
            });
            it('\\left and \\right', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\left[1+1\\right]').toTeX());
            });
            it('\\big', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\big[1+1\\big]').toTeX());
            });
            it('\\bigg', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\bigg[1+1\\bigg]').toTeX());
            });
            it('\\Big', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\Big[1+1\\Big]').toTeX());
            });
            it('\\Bigg', () => {
                assert.equal('4', nerdamer.convertFromLaTeX('2 \\Bigg[1+1\\Bigg]').toTeX());
            });
        });
    });

    context('Spaces', () => {
        it('thinspace', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\, + \\, 1').toTeX());
        });
        it('negative thinspace', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\! + \\! 1').toTeX());
        });
        it('medium mu skip', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\> + \\> 1').toTeX());
        });
        it('medium mu skip 2', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\: + \\: 1').toTeX());
        });
        it('thick mu skip', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\; + \\; 1').toTeX());
        });
        it('en space', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\enspace + \\enspace 1').toTeX());
        });
        it('quad', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\quad + \\quad 1').toTeX());
        });
        it('qquad', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\qquad + \\qquad 1').toTeX());
        });
        it('control space', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\ + \\ 1').toTeX());
        });
        it('non-breaking space', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 ~ + ~ 1').toTeX());
        });
        it('hspace', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\hspace{1cm} + \\hspace{2en} 1').toTeX());
        });
        it('hfill', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 + \\hfill 1').toTeX());
        });
        it('hphantom', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\hphantom{1cm} + \\hphantom{2en} 1').toTeX());
        });
        it('phantom', () => {
            assert.equal('2', nerdamer.convertFromLaTeX('1 \\phantom{1cm} + \\phantom{2en} 1').toTeX());
        });
    });
})

describe('Alternative Function', () => {
    context('Triganometry', () => {
        it('sin', () => {
            assert.equal('', nerdamer.convertFromLaTeX('\\sin \\pi/2').toTeX());
        });
    });
});

describe('Matricies', () => {

});

describe('Calculus', () => {
    context('Derivatives', () => {

    });
    context('Partial Derivatives', () => {

    });
    context('Integrals', () => {
        it('2x', () => {
            assert.equal('x^{2}', nerdamer.convertFromLaTeX('\\int 2x dx').toTeX());
        });
        it('2x with mathrm d', () => {
            assert.equal('x^{2}', nerdamer.convertFromLaTeX('\\int 2x \\mathrm{d}x').toTeX());
        });
        it('trig', () => {
            assert.equal('-\\cos\\left(x\\right)', nerdamer.convertFromLaTeX('\\int \\sin dx').toTeX());
        });

    });
    context('Definate Integrals', () => {

    });
});

describe('Solving', () => {

});

describe('Common Packages', () => {
    context('xfrac', () => {
        it('\\sfrac', () => {
            assert.equal('3', nerdamer.convertFromLaTeX('\\sfrac{6}{2}').toTeX());
        });
    });
});
