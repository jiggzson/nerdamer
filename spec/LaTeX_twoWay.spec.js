'use strict';

var nerdamer = require('../all.js');
// var utils = require('./support/utils');
// var _ = utils.toFixed;
// var run = utils.run;

// Because I don't like typing lots and lots, ncfl = nerdamer convert from latex
const ncfl = nerdamer.convertFromLaTeX;

describe('Nerdamer function equivilents', () => {
    describe('Triganometry', () => {
        it('sin, cos, tan', () => {
            expect(ncfl('\\sin(x)').toTeX()).toEqual('\\sin\\left(x\\right)');
            expect(ncfl('\\cos(x)').toTeX()).toEqual('\\cos\\left(x\\right)');
            expect(ncfl('\\tan(x)').toTeX()).toEqual('\\tan\\left(x\\right)');
        });

        it('cot, sec, csc', () => {
            expect(ncfl('\\cot(x)').toTeX()).toEqual('\\cot\\left(x\\right)');
            expect(ncfl('\\sec(x)').toTeX()).toEqual('\\sec\\left(x\\right)');
            expect(ncfl('\\csc(x)').toTeX()).toEqual('\\csc\\left(x\\right)');
        });
        it('arcsin, arccos, arctan', () => {
            expect(ncfl('\\arcsin(x)').toTeX()).toEqual('\\arcsin\\left(x\\right)');
            expect(ncfl('\\arccos(x)').toTeX()).toEqual('\\arccos\\left(x\\right)');
            expect(ncfl('\\arctan(x)').toTeX()).toEqual('\\arctan\\left(x\\right)');
        });
        it('sinh, cosh, tanh', () => {
            expect(ncfl('\\sinh(x)').toTeX()).toEqual('\\sinh\\left(x\\right)');
            expect(ncfl('\\cosh(x)').toTeX()).toEqual('\\cosh\\left(x\\right)');
            expect(ncfl('\\tanh(x)').toTeX()).toEqual('\\tanh\\left(x\\right)');
        });
        it('coth, sech, ,csch', () => {
            expect(ncfl('\\coth(x)').toTeX()).toEqual('\\coth\\left(x\\right)');
            expect(ncfl('\\sech(x)').toTeX()).toEqual('\\sech\\left(x\\right)');
            expect(ncfl('\\csch(x)').toTeX()).toEqual('\\csch\\left(x\\right)');
        });
        it('sin of pi/2', () => {
            expect(ncfl('\\sin(\\pi/2)').toTeX()).toEqual("1");
        });
        it('sin of 90deg', () => {
            expect(ncfl('\\sin(90\\deg)').toTeX()).toEqual("1");
        });
    });
    describe('Logs', () => {
        it('log()', () => {
            expect(ncfl('\\log(a)').toTeX()).toEqual("\\log\\left(a\\right)");
        });
        it('log', () => {
            expect(ncfl('\\log a').toTeX()).toEqual("\\log\\left(a\\right)");
        });
        it('ln', () => {
            expect(ncfl('\\ln(a)').toTeX()).toEqual("\\log\\left(a\\right")
            expect(ncfl('\\ln(e)').toTeX()).toEqual("1");
        });
        it('log_2', () => {
            expect(ncfl('\\log_2(a)').toTeX()).toEqual("\\log_{2}\\left(a\\right)");
            expect(ncfl('\\log_2(2)').toTeX()).toEqual("1");
        });
        it('log_{10}', () => {
            expect(ncfl('\\log_{10}(a)').toTeX()).toEqual("\\log_{10}\\left(a\\right)");
            expect(ncfl('\\log_{10}(10)').toTeX()).toEqual("1");
        });
    });
    describe('Roots', () => {
        it('square root', () => {
            expect(ncfl('\\sqrt{4}').toTeX()).toEqual("2");
            expect(ncfl('\\sqrt{5}').toTeX()).toEqual("\\sqrt{5}");
        });
        it('cube root', () => {
            expect(ncfl('\\sqrt[3]{8}').toTeX()).toEqual("2");
            expect(ncfl('\\sqrt[3]{5}').toTeX()).toEqual("\\sqrt[3]{5}");
        });
        it('nth root', () => {
            expect(ncfl('\\sqrt[n]{2}').toTeX()).toEqual("\\sqrt[n]{2}");
        });
        it('nth root of 2^n', () => {
            expect(ncfl('\\sqrt[n]{2^n}').toTeX()).toEqual("2");
        });
    });
    it('Greek letters', () => {
        expect(ncfl('\\alpha').toTeX()).toEqual('\\alpha');
        expect(ncfl('\\theta').toTeX()).toEqual('\\theta');
        expect(ncfl('\\tau').toTeX()).toEqual('\\tau');
        expect(ncfl('\\beta').toTeX()).toEqual('\\beta');
        expect(ncfl('\\pi').toTeX()).toEqual('\\pi');
        expect(ncfl('\\upsilon').toTeX()).toEqual('\\upsilon');
        expect(ncfl('\\gamma').toTeX()).toEqual('\\gamma');
        expect(ncfl('\\gamma').toTeX()).toEqual('\\gamma');
        expect(ncfl('\\phi').toTeX()).toEqual('\\phi');
        expect(ncfl('\\delta').toTeX()).toEqual('\\delta');
        expect(ncfl('\\kappa').toTeX()).toEqual('\\kappa');
        expect(ncfl('\\rho').toTeX()).toEqual('\\rho');
        expect(ncfl('\\epsilon').toTeX()).toEqual('\\epsilon');
        expect(ncfl('\\lambda').toTeX()).toEqual('\\lambda');
        expect(ncfl('\\chi').toTeX()).toEqual('\\chi');
        expect(ncfl('\\mu').toTeX()).toEqual('\\mu');
        expect(ncfl('\\sigma').toTeX()).toEqual('\\sigma');
        expect(ncfl('\\psi').toTeX()).toEqual('\\psi');
        expect(ncfl('\\zeta').toTeX()).toEqual('\\zeta');
        expect(ncfl('\\nu').toTeX()).toEqual('\\nu');
        expect(ncfl('\\omega').toTeX()).toEqual('\\omega');
        expect(ncfl('\\eta').toTeX()).toEqual('\\eta');
        expect(ncfl('\\xi').toTeX()).toEqual('\\xi');
        expect(ncfl('\\Gamma').toTeX()).toEqual('\\Gamma');
        expect(ncfl('\\Lambda').toTeX()).toEqual('\\Lambda');
        expect(ncfl('\\Sigma').toTeX()).toEqual('\\Sigma');
        expect(ncfl('\\Psi').toTeX()).toEqual('\\Psi');
        expect(ncfl('\\Delta').toTeX()).toEqual('\\Delta');
        expect(ncfl('\\Xi').toTeX()).toEqual('\\Xi');
        expect(ncfl('\\Upsilon').toTeX()).toEqual('\\Upsilon');
        expect(ncfl('\\Omega').toTeX()).toEqual('\\Omega');
        expect(ncfl('\\Theta').toTeX()).toEqual('\\Theta');
        expect(ncfl('\\Pi').toTeX()).toEqual('\\Pi');
        expect(ncfl('\\Phi').toTeX()).toEqual('\\Phi');
    });
    it('Greek letter variants', () => {
        expect(ncfl('\\vartheta').toTeX()).toEqual('\\vartheta');
        expect(ncfl('\\varpi').toTeX()).toEqual('\\varpi');
        expect(ncfl('\\varphi').toTeX()).toEqual('\\varphi');
        expect(ncfl('\\varrho').toTeX()).toEqual('\\varrho');
        expect(ncfl('\\varepsilon').toTeX()).toEqual('\\varepsilon');
        expect(ncfl('\\varsigma').toTeX()).toEqual('\\varsigma');
    });

    it('Other Symbols', () => {
        expect(ncfl('\\arg').toTeX()).toEqual('\\arg');
        expect(ncfl('\\deg').toTeX()).toEqual('\\deg');
        expect(ncfl('\\det').toTeX()).toEqual('\\det');
        expect(ncfl('\\dim').toTeX()).toEqual('\\dim');
        expect(ncfl('\\exp').toTeX()).toEqual('\\exp');
        expect(ncfl('\\gcd').toTeX()).toEqual('\\gcd');
        expect(ncfl('\\hom').toTeX()).toEqual('\\hom');
        expect(ncfl('\\inf').toTeX()).toEqual('\\inf');
        expect(ncfl('\\ker').toTeX()).toEqual('\\ker');
        expect(ncfl('\\lg').toTeX()).toEqual('\\lg');
        expect(ncfl('\\lim').toTeX()).toEqual('\\lim');
        expect(ncfl('\\liminf').toTeX()).toEqual('\\liminf');
        expect(ncfl('\\limsup').toTeX()).toEqual('\\limsup');
        expect(ncfl('\\max').toTeX()).toEqual('\\max');
        expect(ncfl('\\min').toTeX()).toEqual('\\min');
        expect(ncfl('\\Pr').toTeX()).toEqual('\\Pr');
        expect(ncfl('\\sup').toTeX()).toEqual('\\sup');
    });
});

describe('Basic Operators', () => {
    describe('Basic Operations', () => {
        it('Addition', () => {
            expect(ncfl('2 + 2').toTeX()).toEqual('4');
        });
        it('Subtraction', () => {
            expect(ncfl('3 - 1').toTeX()).toEqual('2');
            expect(ncfl('1 - -1').toTeX()).toEqual('2');
        });
        describe('Multiplication', () => {
            it('\\cdot', () => {
                expect(ncfl('2 \\cdot 3').toTeX()).toEqual('6');
            });
            it('\\times', () => {
                expect(ncfl('2 \\times 3').toTeX()).toEqual('6');
            });
        });
        describe('Division', () => {
            it('\\frac', () => {
                expect(ncfl('\\frac{6}{2}').toTeX()).toEqual('3');
            });
            it('Division Symbol', () => {
                expect(ncfl('6 \\div 2').toTeX()).toEqual('3');
            });
            it('Slash', () => {
                expect(ncfl('6/3').toTeX()).toEqual('2');
            });
            it('Nested fractions', () => {
                expect(ncfl('\\frac{\\frac{\\frac{7}{4}}{2\\frac{7}{3}}}{\\frac{6}{16}}').toTeX()).toEqual('1');
            });
            it('Display Fraction', () => {
                expect(ncfl('\\dfrac{6}{2}').toTeX()).toEqual('3');
            });
        });
        it('Exponents', () => {
            expect(ncfl('2^3').toTeX()).toEqual('8');
            expect(ncfl('2^{3}').toTeX()).toEqual('8');
            expect(ncfl('{2}^{3}').toTeX()).toEqual('8');
        });
    });

    describe('Brackets', () => {
        describe('Parenthesies', () => {
            it('Simple Brackets', () => {
                expect(ncfl('2(1+1)').toTeX()).toEqual('4');
            });
            it('\\left and \\right', () => {
                expect(ncfl('2 \\left(1+1\\right)').toTeX()).toEqual('4');
            });
            it('\\big', () => {
                expect(ncfl('2 \\big(1+1\\big)').toTeX()).toEqual('4');
            });
            it('\\bigg', () => {
                expect(ncfl('2 \\bigg(1+1\\bigg)').toTeX()).toEqual('4');
            });
            it('\\Big', () => {
                expect(ncfl('2 \\Big(1+1\\Big)').toTeX()).toEqual('4');
            });
            it('\\Bigg', () => {
                expect(ncfl('2 \\Bigg(1+1\\Bigg)').toTeX()).toEqual('4');
            });
        });
        describe('Square Brackets', () => {
            it('Simple Brackets', () => {
                expect(ncfl('2[1+1]').toTeX()).toEqual('4');
            });
            it('\\left and \\right', () => {
                expect(ncfl('2 \\left[1+1\\right]').toTeX()).toEqual('4');
            });
            it('\\big', () => {
                expect(ncfl('2 \\big[1+1\\big]').toTeX()).toEqual('4');
            });
            it('\\bigg', () => {
                expect(ncfl('2 \\bigg[1+1\\bigg]').toTeX()).toEqual('4');
            });
            it('\\Big', () => {
                expect(ncfl('2 \\Big[1+1\\Big]').toTeX()).toEqual('4');
            });
            it('\\Bigg', () => {
                expect(ncfl('2 \\Bigg[1+1\\Bigg]').toTeX()).toEqual('4');
            });
        });
    });

    describe('Spaces', () => {
        it('thinspace', () => {
            expect(ncfl('1 \\, + \\, 1').toTeX()).toEqual('2');
        });
        it('negative thinspace', () => {
            expect(ncfl('1 \\! + \\! 1').toTeX()).toEqual('2');
        });
        it('medium mu skip', () => {
            expect(ncfl('1 \\> + \\> 1').toTeX()).toEqual('2');
        });
        it('medium mu skip 2', () => {
            expect(ncfl('1 \\: + \\: 1').toTeX()).toEqual('2');
        });
        it('thick mu skip', () => {
            expect(ncfl('1 \\; + \\; 1').toTeX()).toEqual('2');
        });
        it('en space', () => {
            expect(ncfl('1 \\enspace + \\enspace 1').toTeX()).toEqual('2');
        });
        it('quad', () => {
            expect(ncfl('1 \\quad + \\quad 1').toTeX()).toEqual('2');
        });
        it('qquad', () => {
            expect(ncfl('1 \\qquad + \\qquad 1').toTeX()).toEqual('2');
        });
        it('control space', () => {
            expect(ncfl('1 \\ + \\ 1').toTeX()).toEqual('2');
        });
        it('non-breaking space', () => {
            expect(ncfl('1 ~ + ~ 1').toTeX()).toEqual('2');
        });
        it('hspace', () => {
            expect(ncfl('1 \\hspace{1cm} + \\hspace{2en} 1').toTeX()).toEqual('2');
        });
        it('hfill', () => {
            expect(ncfl('1 + \\hfill 1').toTeX()).toEqual('2');
        });
        it('hphantom', () => {
            expect(ncfl('1 \\hphantom{1cm} + \\hphantom{2en} 1').toTeX()).toEqual('2');
        });
        it('phantom', () => {
            expect(ncfl('1 \\phantom{1cm} + \\phantom{2en} 1').toTeX()).toEqual('2');
        });
    });
})

describe('Matricies', () => {

});

describe('Calculus', () => {
    describe('Derivatives', () => {

    });
    describe('Partial Derivatives', () => {

    });
    describe('Integrals', () => {
        it('2x', () => {
            expect(ncfl('\\int 2x dx').toTeX()).toEqual('x^{2}');
        });
        it('2x with mathrm d', () => {
            expect(ncfl('\\int 2x \\mathrm{d}x').toTeX()).toEqual('x^{2}');
        });
        it('trig', () => {
            expect(ncfl('\\int \\sin dx').toTeX()).toEqual('-\\cos\\left(x\\right)');
        });

    });
    describe('Definate Integrals', () => {

    });
});

describe('Solving', () => {

});

describe('Common Packages', () => {
    describe('xfrac', () => {
        it('\\sfrac', () => {
            expect(ncfl('\\sfrac{6}{2}').toTeX()).toEqual('3');
        });
    });
});
