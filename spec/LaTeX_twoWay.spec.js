'use strict';

var nerdamer = require('../all.js');
// var utils = require('./support/utils');
// var _ = utils.toFixed;
// var run = utils.run;

// Because I don't like typing lots and lots, fttt (from tex to tex) = nerdamer convert from latex to tex
const fttt = (s) => nerdamer.convertFromLaTeX(s).toTeX();

describe('Potential Catch-Cases', () => {
    it('Multiply with \\operator', () => {
        expect(fttt('2 \\times 2')).toEqual('4');
        expect(fttt('2 \\div 2')).toEqual('1');
        expect(fttt('\\log e')).toEqual('1');
    });
    it('But not just operator', () => {
        expect(fttt('2 times 2')).not.toEqual('4');
        // expect(fttt('2 div 2')).not.toEqual('1');
        expect(fttt('log e')).not.toEqual('1');
    });
});

describe('Nerdamer function equivilents', () => {
    describe('Triganometry', () => {
        it('sin, cos, tan', () => {
            expect(fttt('\\sin(x)')).toEqual('\\sin\\left(x\\right)');
            expect(fttt('\\cos(x)')).toEqual('\\cos\\left(x\\right)');
            expect(fttt('\\tan(x)')).toEqual('\\tan\\left(x\\right)');
        });

        it('cot, sec, csc', () => {
            expect(fttt('\\cot(x)')).toEqual('\\cot\\left(x\\right)');
            expect(fttt('\\sec(x)')).toEqual('\\sec\\left(x\\right)');
            expect(fttt('\\csc(x)')).toEqual('\\csc\\left(x\\right)');
        });
        it('arcsin, arccos, arctan', () => {
            expect(fttt('\\arcsin(x)')).toEqual('\\arcsin\\left(x\\right)');
            expect(fttt('\\arccos(x)')).toEqual('\\arccos\\left(x\\right)');
            expect(fttt('\\arctan(x)')).toEqual('\\arctan\\left(x\\right)');
        });
        it('sinh, cosh, tanh', () => {
            expect(fttt('\\sinh(x)')).toEqual('\\sinh\\left(x\\right)');
            expect(fttt('\\cosh(x)')).toEqual('\\cosh\\left(x\\right)');
            expect(fttt('\\tanh(x)')).toEqual('\\tanh\\left(x\\right)');
        });
        it('coth', () => {
            expect(fttt('\\coth(x)')).toEqual('\\coth\\left(x\\right)');
            // expect(fttt('\\sech(x)')).toEqual('\\sech\\left(x\\right)');
            // expect(fttt('\\csch(x)')).toEqual('\\csch\\left(x\\right)');
        });
        it('sin of pi/2', () => {
            expect(fttt('\\sin(\\pi/2)')).toEqual("1");
        });
        it('sin of 90deg', () => {
            expect(fttt('\\sin(90\\deg)')).toEqual("1");
        });
    });
    describe('Logs', () => {
        it('log(a)', () => {
            expect(fttt('\\log(a)')).toEqual("\\log\\left(a\\right)");
        });
        it('log a', () => {
            expect(fttt('\\log a')).toEqual("\\log\\left(a\\right)");
        });
        it('ln', () => {
            expect(fttt('\\ln(a)')).toEqual("\\ln\\left(a\\right")
            expect(fttt('\\ln(e)')).toEqual("1");
        });
        it('log_2', () => {
            expect(fttt('\\log_2(a)')).toEqual("\\log_{2}\\left(a\\right)");
            expect(fttt('\\log_2(2)')).toEqual("1");
        });
        it('log_{10}', () => {
            expect(fttt('\\log_{10}(a)')).toEqual("\\log_{10}\\left(a\\right)");
            expect(fttt('\\log_{10}(10)')).toEqual("1");
        });
    });
    describe('Roots', () => {
        it('square root', () => {
            expect(fttt('\\sqrt{4}')).toEqual("2");
            expect(fttt('\\sqrt{5}')).toEqual("\\sqrt{5}");
        });
        it('cube root', () => {
            expect(fttt('\\sqrt[3]{8}')).toEqual("2");
            expect(fttt('\\sqrt[3]{5}')).toEqual("\\sqrt[3]{5}");
        });
        it('nth root', () => {
            expect(fttt('\\sqrt[n]{2}')).toEqual("\\sqrt[n]{2}");
        });
        it('nth root of 2^n', () => {
            expect(fttt('\\sqrt[n]{2^n}')).toEqual("2");
        });
    });
    it('Greek letters', () => {
        expect(fttt('\\alpha')).toEqual('\\alpha');
        expect(fttt('\\theta')).toEqual('\\theta');
        expect(fttt('\\tau')).toEqual('\\tau');
        expect(fttt('\\beta')).toEqual('\\beta');
        expect(fttt('\\pi')).toEqual('\\pi');
        expect(fttt('\\upsilon')).toEqual('\\upsilon');
        expect(fttt('\\gamma')).toEqual('\\gamma');
        expect(fttt('\\gamma')).toEqual('\\gamma');
        expect(fttt('\\phi')).toEqual('\\phi');
        expect(fttt('\\delta')).toEqual('\\delta');
        expect(fttt('\\kappa')).toEqual('\\kappa');
        expect(fttt('\\rho')).toEqual('\\rho');
        expect(fttt('\\epsilon')).toEqual('\\epsilon');
        expect(fttt('\\lambda')).toEqual('\\lambda');
        expect(fttt('\\chi')).toEqual('\\chi');
        expect(fttt('\\mu')).toEqual('\\mu');
        expect(fttt('\\sigma')).toEqual('\\sigma');
        expect(fttt('\\psi')).toEqual('\\psi');
        expect(fttt('\\zeta')).toEqual('\\zeta');
        expect(fttt('\\nu')).toEqual('\\nu');
        expect(fttt('\\omega')).toEqual('\\omega');
        expect(fttt('\\eta')).toEqual('\\eta');
        expect(fttt('\\xi')).toEqual('\\xi');
        expect(fttt('\\Gamma')).toEqual('\\Gamma');
        expect(fttt('\\Lambda')).toEqual('\\Lambda');
        expect(fttt('\\Sigma')).toEqual('\\Sigma');
        expect(fttt('\\Psi')).toEqual('\\Psi');
        expect(fttt('\\Delta')).toEqual('\\Delta');
        expect(fttt('\\Xi')).toEqual('\\Xi');
        expect(fttt('\\Upsilon')).toEqual('\\Upsilon');
        expect(fttt('\\Omega')).toEqual('\\Omega');
        expect(fttt('\\Theta')).toEqual('\\Theta');
        expect(fttt('\\Pi')).toEqual('\\Pi');
        expect(fttt('\\Phi')).toEqual('\\Phi');
    });
    it('Greek letter variants', () => {
        expect(fttt('\\vartheta')).toEqual('\\vartheta');
        expect(fttt('\\varpi')).toEqual('\\varpi');
        expect(fttt('\\varphi')).toEqual('\\varphi');
        expect(fttt('\\varrho')).toEqual('\\varrho');
        expect(fttt('\\varepsilon')).toEqual('\\varepsilon');
        expect(fttt('\\varsigma')).toEqual('\\varsigma');
    });

    it('Other Symbols', () => {
        expect(fttt('\\arg')).toEqual('\\arg');
        expect(fttt('\\deg')).toEqual('\\deg');
        expect(fttt('\\det')).toEqual('\\det');
        expect(fttt('\\dim')).toEqual('\\dim');
        expect(fttt('\\exp')).toEqual('\\exp');
        expect(fttt('\\gcd')).toEqual('\\gcd');
        expect(fttt('\\hom')).toEqual('\\hom');
        expect(fttt('\\inf')).toEqual('\\inf');
        expect(fttt('\\ker')).toEqual('\\ker');
        expect(fttt('\\lg')).toEqual('\\lg');
        expect(fttt('\\lim')).toEqual('\\lim');
        expect(fttt('\\liminf')).toEqual('\\liminf');
        expect(fttt('\\limsup')).toEqual('\\limsup');
        expect(fttt('\\max')).toEqual('\\max');
        expect(fttt('\\min')).toEqual('\\min');
        expect(fttt('\\Pr')).toEqual('\\Pr');
        expect(fttt('\\sup')).toEqual('\\sup');
    });
});

describe('Basic Operators', () => {
    describe('Basic Operations', () => {
        it('Addition', () => {
            expect(fttt('2 + 2')).toEqual('4');
        });
        it('Subtraction', () => {
            expect(fttt('3 - 1')).toEqual('2');
            expect(fttt('1 - -1')).toEqual('2');
        });
        describe('Multiplication', () => {
            it('\\cdot', () => {
                expect(fttt('2 \\cdot 3')).toEqual('6');
            });
            it('\\times', () => {
                expect(fttt('2 \\times 3')).toEqual('6');
            });
            it('Implicit Multiplication', () => {
                expect(fttt('3(4)')).toEqual('12');
            });
        });
        describe('Division', () => {
            it('\\frac', () => {
                expect(fttt('\\frac{6}{2}')).toEqual('3');
            });
            it('Division Symbol', () => {
                expect(fttt('6 \\div 2')).toEqual('3');
            });
            it('Slash', () => {
                expect(fttt('6/3')).toEqual('2');
            });
            it('Nested fractions', () => {
                expect(fttt('\\frac{\\frac{\\frac{7}{4}}{2\\frac{7}{3}}}{\\frac{6}{16}}')).toEqual('1');
            });
            it('Display Fraction', () => {
                expect(fttt('\\dfrac{6}{2}')).toEqual('3');
            });
        });
        it('Exponents', () => {
            expect(fttt('2^3')).toEqual('8');
            expect(fttt('2^{3}')).toEqual('8');
            expect(fttt('{2}^{3}')).toEqual('8');
        });
    });

    describe('Brackets', () => {
        describe('Parenthesies', () => {
            it('Simple Brackets', () => {
                expect(fttt('2(1+1)')).toEqual('4');
            });
            it('\\left and \\right', () => {
                expect(fttt('2 \\left(1+1\\right)')).toEqual('4');
            });
            it('\\big', () => {
                expect(fttt('2 \\big(1+1\\big)')).toEqual('4');
            });
            it('\\bigg', () => {
                expect(fttt('2 \\bigg(1+1\\bigg)')).toEqual('4');
            });
            it('\\Big', () => {
                expect(fttt('2 \\Big(1+1\\Big)')).toEqual('4');
            });
            it('\\Bigg', () => {
                expect(fttt('2 \\Bigg(1+1\\Bigg)')).toEqual('4');
            });
        });
        // describe('Square Brackets', () => {
        //     it('Simple Brackets', () => {
        //         expect(fttt('2[1+1]')).toEqual('4');
        //     });
        //     it('\\left and \\right', () => {
        //         expect(fttt('2 \\left[1+1\\right]')).toEqual('4');
        //     });
        //     it('\\big', () => {
        //         expect(fttt('2 \\big[1+1\\big]')).toEqual('4');
        //     });
        //     it('\\bigg', () => {
        //         expect(fttt('2 \\bigg[1+1\\bigg]')).toEqual('4');
        //     });
        //     it('\\Big', () => {
        //         expect(fttt('2 \\Big[1+1\\Big]')).toEqual('4');
        //     });
        //     it('\\Bigg', () => {
        //         expect(fttt('2 \\Bigg[1+1\\Bigg]')).toEqual('4');
        //     });
        // });
    });

    describe('Spaces', () => {
        it('thinspace', () => {
            expect(fttt('1 \\, + \\, 1')).toEqual('2');
        });
        it('negative thinspace', () => {
            expect(fttt('1 \\! + \\! 1')).toEqual('2');
        });
        it('medium mu skip', () => {
            expect(fttt('1 \\> + \\> 1')).toEqual('2');
        });
        it('medium mu skip 2', () => {
            expect(fttt('1 \\: + \\: 1')).toEqual('2');
        });
        it('thick mu skip', () => {
            expect(fttt('1 \\; + \\; 1')).toEqual('2');
        });
        it('en space', () => {
            expect(fttt('1 \\enspace + \\enspace 1')).toEqual('2');
        });
        it('quad', () => {
            expect(fttt('1 \\quad + \\quad 1')).toEqual('2');
        });
        it('qquad', () => {
            expect(fttt('1 \\qquad + \\qquad 1')).toEqual('2');
        });
        it('control space', () => {
            expect(fttt('1 \\ + \\ 1')).toEqual('2');
        });
        it('non-breaking space', () => {
            expect(fttt('1 ~ + ~ 1')).toEqual('2');
        });
        it('hspace', () => {
            expect(fttt('1 \\hspace{1cm} + \\hspace{2en} 1')).toEqual('2');
        });
        it('hfill', () => {
            expect(fttt('1 + \\hfill 1')).toEqual('2');
        });
        it('hphantom', () => {
            expect(fttt('1 \\hphantom{1cm} + \\hphantom{2en} 1')).toEqual('2');
        });
        it('phantom', () => {
            expect(fttt('1 \\phantom{1cm} + \\phantom{2en} 1')).toEqual('2');
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
            expect(fttt('\\int 2x dx')).toEqual('x^{2}');
        });
        it('2x with mathrm d', () => {
            expect(fttt('\\int 2x \\mathrm{d}x')).toEqual('x^{2}');
        });
        it('trig', () => {
            expect(fttt('\\int \\sin dx')).toEqual('-\\cos\\left(x\\right)');
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
            expect(fttt('\\sfrac{6}{2}')).toEqual('3');
        });
    });
});
