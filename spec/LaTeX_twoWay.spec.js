'use strict';

var nerdamer = require('../all.js');
// var utils = require('./support/utils');
// var _ = utils.toFixed;
// var run = utils.run;

// Because I don't like typing lots and lots, fttt (from tex to tex) = nerdamer convert from latex to tex
const ft = (s) => nerdamer.convertFromLaTeX(s);
const fttt = (s) => nerdamer.convertFromLaTeX(s).toTeX();

describe('Potential Catch-Cases', () => {
    it('Multiply with \\operator', () => {
        expect(nerdamer.convertFromLaTeX('2 \\times 2').toTeX()).toEqual('4');
        expect(nerdamer.convertFromLaTeX('2 \\div 2').toTeX()).toEqual('1');
        expect(nerdamer.convertFromLaTeX('\\log e').toTeX()).toEqual('1');
    });
    it('But not just operator', () => {
        expect(nerdamer.convertFromLaTeX('2 times 2').toTeX()).not.toEqual('4');
        expect(nerdamer.convertFromLaTeX('2 div 2').toTeX()).not.toEqual('1');
        expect(nerdamer.convertFromLaTeX('log e').toTeX()).not.toEqual('1');
    });
});

describe('Nerdamer function equivilents', () => {
    describe('Triganometry', () => {
        it('sin, cos, tan', () => {
            expect(nerdamer.convertFromLaTeX('\\sin(x)').toTeX()).toEqual('\\sin\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\cos(x)').toTeX()).toEqual('\\cos\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\tan(x)').toTeX()).toEqual('\\tan\\left(x\\right)');
        });

        it('cot, sec, csc', () => {
            expect(nerdamer.convertFromLaTeX('\\cot(x)').toTeX()).toEqual('\\cot\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\sec(x)').toTeX()).toEqual('\\sec\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\csc(x)').toTeX()).toEqual('\\csc\\left(x\\right)');
        });
        it('arcsin, arccos, arctan', () => {
            expect(nerdamer.convertFromLaTeX('\\arcsin(x)').toTeX()).toEqual('\\arcsin\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\arccos(x)').toTeX()).toEqual('\\arccos\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\arctan(x)').toTeX()).toEqual('\\arctan\\left(x\\right)');
        });
        it('sinh, cosh, tanh', () => {
            expect(nerdamer.convertFromLaTeX('\\sinh(x)').toTeX()).toEqual('\\sinh\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\cosh(x)').toTeX()).toEqual('\\cosh\\left(x\\right)');
            expect(nerdamer.convertFromLaTeX('\\tanh(x)').toTeX()).toEqual('\\tanh\\left(x\\right)');
        });
        it('coth', () => {
            expect(nerdamer.convertFromLaTeX('\\coth(x)').toTeX()).toEqual('\\coth\\left(x\\right)');
            // expect(nerdamer.convertFromLaTeX('\\sech(x)').toTeX()).toEqual('\\sech\\left(x\\right)');
            // expect(nerdamer.convertFromLaTeX('\\csch(x)').toTeX()).toEqual('\\csch\\left(x\\right)');
        });
        it('sin of pi/2', () => {
            expect(nerdamer.convertFromLaTeX('\\sin(\\pi/2)').toTeX()).toEqual("1");
        });
        it('sin of 90deg', () => {
            expect(nerdamer.convertFromLaTeX('\\sin(90\\deg)').toTeX()).toEqual("1");
        });
    });
    describe('Logs', () => {
        it('log(a)', () => {
            expect(nerdamer.convertFromLaTeX('\\log(a)').toTeX()).toEqual("\\log\\left(a\\right)");
        });
        it('log a', () => {
            expect(nerdamer.convertFromLaTeX('\\log a').toTeX()).toEqual("\\log\\left(a\\right)");
        });
        it('ln', () => {
            expect(nerdamer.convertFromLaTeX('\\ln(a)').toTeX()).toEqual("\\ln\\left(a\\right")
            expect(nerdamer.convertFromLaTeX('\\ln(e)').toTeX()).toEqual("1");
        });
        it('log_2', () => {
            expect(nerdamer.convertFromLaTeX('\\log_2(a)').toTeX()).toEqual("\\log_{2}\\left(a\\right)");
            expect(nerdamer.convertFromLaTeX('\\log_2(2)').toTeX()).toEqual("1");
        });
        it('log_{10}', () => {
            expect(nerdamer.convertFromLaTeX('\\log_{10}(a)').toTeX()).toEqual("\\log_{10}\\left(a\\right)");
            expect(nerdamer.convertFromLaTeX('\\log_{10}(10)').toTeX()).toEqual("1");
        });
    });
    describe('Roots', () => {
        it('square root', () => {
            expect(nerdamer.convertFromLaTeX('\\sqrt{4}').toTeX()).toEqual("2");
            expect(nerdamer.convertFromLaTeX('\\sqrt{5}').toTeX()).toEqual("\\sqrt{5}");
        });
        it('cube root', () => {
            expect(nerdamer.convertFromLaTeX('\\sqrt[3]{8}').toTeX()).toEqual("2");
            expect(nerdamer.convertFromLaTeX('\\sqrt[3]{5}').toTeX()).toEqual("\\sqrt[3]{5}");
        });
        it('nth root', () => {
            expect(nerdamer.convertFromLaTeX('\\sqrt[n]{2}').toTeX()).toEqual("\\sqrt[n]{2}");
        });
        it('nth root of 2^n', () => {
            expect(nerdamer.convertFromLaTeX('\\sqrt[n]{2^n}').toTeX()).toEqual("2");
        });
    });
    it('Greek letters', () => {
        expect(nerdamer.convertFromLaTeX('\\alpha').toTeX()).toEqual('\\alpha');
        expect(nerdamer.convertFromLaTeX('\\theta').toTeX()).toEqual('\\theta');
        expect(nerdamer.convertFromLaTeX('\\tau').toTeX()).toEqual('\\tau');
        expect(nerdamer.convertFromLaTeX('\\beta').toTeX()).toEqual('\\beta');
        expect(nerdamer.convertFromLaTeX('\\pi').toTeX()).toEqual('\\pi');
        expect(nerdamer.convertFromLaTeX('\\upsilon').toTeX()).toEqual('\\upsilon');
        expect(nerdamer.convertFromLaTeX('\\gamma').toTeX()).toEqual('\\gamma');
        expect(nerdamer.convertFromLaTeX('\\gamma').toTeX()).toEqual('\\gamma');
        expect(nerdamer.convertFromLaTeX('\\phi').toTeX()).toEqual('\\phi');
        expect(nerdamer.convertFromLaTeX('\\delta').toTeX()).toEqual('\\delta');
        expect(nerdamer.convertFromLaTeX('\\kappa').toTeX()).toEqual('\\kappa');
        expect(nerdamer.convertFromLaTeX('\\rho').toTeX()).toEqual('\\rho');
        expect(nerdamer.convertFromLaTeX('\\epsilon').toTeX()).toEqual('\\epsilon');
        expect(nerdamer.convertFromLaTeX('\\lambda').toTeX()).toEqual('\\lambda');
        expect(nerdamer.convertFromLaTeX('\\chi').toTeX()).toEqual('\\chi');
        expect(nerdamer.convertFromLaTeX('\\mu').toTeX()).toEqual('\\mu');
        expect(nerdamer.convertFromLaTeX('\\sigma').toTeX()).toEqual('\\sigma');
        expect(nerdamer.convertFromLaTeX('\\psi').toTeX()).toEqual('\\psi');
        expect(nerdamer.convertFromLaTeX('\\zeta').toTeX()).toEqual('\\zeta');
        expect(nerdamer.convertFromLaTeX('\\nu').toTeX()).toEqual('\\nu');
        expect(nerdamer.convertFromLaTeX('\\omega').toTeX()).toEqual('\\omega');
        expect(nerdamer.convertFromLaTeX('\\eta').toTeX()).toEqual('\\eta');
        expect(nerdamer.convertFromLaTeX('\\xi').toTeX()).toEqual('\\xi');
        expect(nerdamer.convertFromLaTeX('\\Gamma').toTeX()).toEqual('\\Gamma');
        expect(nerdamer.convertFromLaTeX('\\Lambda').toTeX()).toEqual('\\Lambda');
        expect(nerdamer.convertFromLaTeX('\\Sigma').toTeX()).toEqual('\\Sigma');
        expect(nerdamer.convertFromLaTeX('\\Psi').toTeX()).toEqual('\\Psi');
        expect(nerdamer.convertFromLaTeX('\\Delta').toTeX()).toEqual('\\Delta');
        expect(nerdamer.convertFromLaTeX('\\Xi').toTeX()).toEqual('\\Xi');
        expect(nerdamer.convertFromLaTeX('\\Upsilon').toTeX()).toEqual('\\Upsilon');
        expect(nerdamer.convertFromLaTeX('\\Omega').toTeX()).toEqual('\\Omega');
        expect(nerdamer.convertFromLaTeX('\\Theta').toTeX()).toEqual('\\Theta');
        expect(nerdamer.convertFromLaTeX('\\Pi').toTeX()).toEqual('\\Pi');
        expect(nerdamer.convertFromLaTeX('\\Phi').toTeX()).toEqual('\\Phi');
    });
    it('Greek letter variants', () => {
        expect(nerdamer.convertFromLaTeX('\\vartheta').toTeX()).toEqual('\\vartheta');
        expect(nerdamer.convertFromLaTeX('\\varpi').toTeX()).toEqual('\\varpi');
        expect(nerdamer.convertFromLaTeX('\\varphi').toTeX()).toEqual('\\varphi');
        expect(nerdamer.convertFromLaTeX('\\varrho').toTeX()).toEqual('\\varrho');
        expect(nerdamer.convertFromLaTeX('\\varepsilon').toTeX()).toEqual('\\varepsilon');
        expect(nerdamer.convertFromLaTeX('\\varsigma').toTeX()).toEqual('\\varsigma');
    });

    it('Other Symbols', () => {
        expect(nerdamer.convertFromLaTeX('\\arg').toTeX()).toEqual('\\arg');
        expect(nerdamer.convertFromLaTeX('\\deg').toTeX()).toEqual('\\deg');
        expect(nerdamer.convertFromLaTeX('\\det').toTeX()).toEqual('\\det');
        expect(nerdamer.convertFromLaTeX('\\dim').toTeX()).toEqual('\\dim');
        expect(nerdamer.convertFromLaTeX('\\exp').toTeX()).toEqual('\\exp');
        expect(nerdamer.convertFromLaTeX('\\gcd').toTeX()).toEqual('\\gcd');
        expect(nerdamer.convertFromLaTeX('\\hom').toTeX()).toEqual('\\hom');
        expect(nerdamer.convertFromLaTeX('\\inf').toTeX()).toEqual('\\inf');
        expect(nerdamer.convertFromLaTeX('\\ker').toTeX()).toEqual('\\ker');
        expect(nerdamer.convertFromLaTeX('\\lg').toTeX()).toEqual('\\lg');
        expect(nerdamer.convertFromLaTeX('\\lim').toTeX()).toEqual('\\lim');
        expect(nerdamer.convertFromLaTeX('\\liminf').toTeX()).toEqual('\\liminf');
        expect(nerdamer.convertFromLaTeX('\\limsup').toTeX()).toEqual('\\limsup');
        expect(nerdamer.convertFromLaTeX('\\max').toTeX()).toEqual('\\max');
        expect(nerdamer.convertFromLaTeX('\\min').toTeX()).toEqual('\\min');
        expect(nerdamer.convertFromLaTeX('\\Pr').toTeX()).toEqual('\\Pr');
        expect(nerdamer.convertFromLaTeX('\\sup').toTeX()).toEqual('\\sup');
    });
});

describe('Basic Operators', () => {
    describe('Basic Operations', () => {
        it('Addition', () => {
            expect(nerdamer.convertFromLaTeX('2 + 2').toTeX()).toEqual('4');
        });
        it('Subtraction', () => {
            expect(nerdamer.convertFromLaTeX('3 - 1').toTeX()).toEqual('2');
            expect(nerdamer.convertFromLaTeX('1 - -1').toTeX()).toEqual('2');
        });
        describe('Multiplication', () => {
            it('\\cdot', () => {
                expect(nerdamer.convertFromLaTeX('2 \\cdot 3').toTeX()).toEqual('6');
            });
            it('\\times', () => {
                expect(nerdamer.convertFromLaTeX('2 \\times 3').toTeX()).toEqual('6');
            });
            it('Implicit Multiplication', () => {
                expect(nerdamer.convertFromLaTeX('3(4)').toTeX()).toEqual('12');
            });
        });
        describe('Division', () => {
            it('\\frac', () => {
                expect(nerdamer.convertFromLaTeX('\\frac{6}{2}').toTeX()).toEqual('3');
            });
            it('Division Symbol', () => {
                expect(nerdamer.convertFromLaTeX('6 \\div 2').toTeX()).toEqual('3');
            });
            it('Slash', () => {
                expect(nerdamer.convertFromLaTeX('6/3').toTeX()).toEqual('2');
            });
            it('Nested fractions', () => {
                expect(nerdamer.convertFromLaTeX('\\frac{\\frac{\\frac{7}{4}}{2\\frac{7}{3}}}{\\frac{6}{16}}').toTeX()).toEqual('1');
            });
            it('Display Fraction', () => {
                expect(nerdamer.convertFromLaTeX('\\dfrac{6}{2}').toTeX()).toEqual('3');
            });
        });
        it('Exponents', () => {
            expect(nerdamer.convertFromLaTeX('2^3').toTeX()).toEqual('8');
            expect(nerdamer.convertFromLaTeX('2^{3}').toTeX()).toEqual('8');
            expect(nerdamer.convertFromLaTeX('{2}^{3}').toTeX()).toEqual('8');
        });
    });

    describe('floor, ceil, round', () => {
    it('flooring', () => {
        expect(nerdamer.convertFromLaTeX('\\lfloor 2.1 \\rfloor').toTeX()).toEqual('2');
    });
    });

    describe('Brackets', () => {
        describe('Parenthesies', () => {
            it('Simple Brackets', () => {
                expect(nerdamer.convertFromLaTeX('2(1+1)').toTeX()).toEqual('4');
            });
            it('\\left and \\right', () => {
                expect(nerdamer.convertFromLaTeX('2 \\left(1+1\\right)').toTeX()).toEqual('4');
            });
            it('Wrapped in {}', () => {
                expect(nerdamer.convertFromLaTeX('{(1+2)}^{(1+1)}').toTeX()).toEqual('9');
            });
            it('\\big', () => {
                expect(nerdamer.convertFromLaTeX('2 \\big(1+1\\big)').toTeX()).toEqual('4');
            });
            it('\\bigg', () => {
                expect(nerdamer.convertFromLaTeX('2 \\bigg(1+1\\bigg)').toTeX()).toEqual('4');
            });
            it('\\Big', () => {
                expect(nerdamer.convertFromLaTeX('2 \\Big(1+1\\Big)').toTeX()).toEqual('4');
            });
            it('\\Bigg', () => {
                expect(nerdamer.convertFromLaTeX('2 \\Bigg(1+1\\Bigg)').toTeX()).toEqual('4');
            });
        });
        // describe('Square Brackets', () => {
        //     it('Simple Brackets', () => {
        //         expect(nerdamer.convertFromLaTeX('2[1+1]').toTeX()).toEqual('4');
        //     });
        //     it('\\left and \\right', () => {
        //         expect(nerdamer.convertFromLaTeX('2 \\left[1+1\\right]').toTeX()).toEqual('4');
        //     });
        //     it('\\big', () => {
        //         expect(nerdamer.convertFromLaTeX('2 \\big[1+1\\big]').toTeX()).toEqual('4');
        //     });
        //     it('\\bigg', () => {
        //         expect(nerdamer.convertFromLaTeX('2 \\bigg[1+1\\bigg]').toTeX()).toEqual('4');
        //     });
        //     it('\\Big', () => {
        //         expect(nerdamer.convertFromLaTeX('2 \\Big[1+1\\Big]').toTeX()).toEqual('4');
        //     });
        //     it('\\Bigg', () => {
        //         expect(nerdamer.convertFromLaTeX('2 \\Bigg[1+1\\Bigg]').toTeX()).toEqual('4');
        //     });
        // });
    });

    describe('Spaces', () => {
        it('thinspace', () => {
            expect(nerdamer.convertFromLaTeX('1 \\, + \\, 1').toTeX()).toEqual('2');
        });
        it('negative thinspace', () => {
            expect(nerdamer.convertFromLaTeX('1 \\! + \\! 1').toTeX()).toEqual('2');
        });
        it('medium mu skip', () => {
            expect(nerdamer.convertFromLaTeX('1 \\> + \\> 1').toTeX()).toEqual('2');
        });
        it('medium mu skip 2', () => {
            expect(nerdamer.convertFromLaTeX('1 \\: + \\: 1').toTeX()).toEqual('2');
        });
        it('thick mu skip', () => {
            expect(nerdamer.convertFromLaTeX('1 \\; + \\; 1').toTeX()).toEqual('2');
        });
        it('en space', () => {
            expect(nerdamer.convertFromLaTeX('1 \\enspace + \\enspace 1').toTeX()).toEqual('2');
        });
        it('quad', () => {
            expect(nerdamer.convertFromLaTeX('1 \\quad + \\quad 1').toTeX()).toEqual('2');
        });
        it('qquad', () => {
            expect(nerdamer.convertFromLaTeX('1 \\qquad + \\qquad 1').toTeX()).toEqual('2');
        });
        it('control space', () => {
            expect(nerdamer.convertFromLaTeX('1 \\ + \\ 1').toTeX()).toEqual('2');
        });
        it('non-breaking space', () => {
            expect(nerdamer.convertFromLaTeX('1 ~ + ~ 1').toTeX()).toEqual('2');
        });
        it('hspace', () => {
            expect(nerdamer.convertFromLaTeX('1 \\hspace{1cm} + \\hspace{2en} 1').toTeX()).toEqual('2');
        });
        it('hfill', () => {
            expect(nerdamer.convertFromLaTeX('1 + \\hfill 1').toTeX()).toEqual('2');
        });
        it('hphantom', () => {
            expect(nerdamer.convertFromLaTeX('1 \\hphantom{1cm} + \\hphantom{2en} 1').toTeX()).toEqual('2');
        });
        it('phantom', () => {
            expect(nerdamer.convertFromLaTeX('1 \\phantom{1cm} + \\phantom{2en} 1').toTeX()).toEqual('2');
        });
    });
})

describe('Matricies', () => {
    it('Basic Case', () => {
        const matrix = `\\begin{bmatrix}
        2 & 1 \\\\
        3 & 2
        \\end{bmatrix}`
        expect(nerdamer.convertFromLaTeX('\\det' + matrix).toTeX()).toEqual('1');
    });
});

describe('Calculus', () => {
    describe('Derivatives', () => {

    });
    describe('Partial Derivatives', () => {

    });
    describe('Integrals', () => {
        it('2x', () => {
            // a = nerdamer.convertFromLaTeX('\\int 2x dx').toTeX();
            expect(nerdamer.convertFromLaTeX('\\int 2x dx').toTeX()).toEqual('x^{2}');
        });
        it('2x with mathrm d', () => {
            expect(nerdamer.convertFromLaTeX('\\int 2x \\mathrm{d}x').toTeX()).toEqual('x^{2}');
        });
        it('trig', () => {
            expect(nerdamer.convertFromLaTeX('\\int \\sin dx').toTeX()).toEqual('-\\cos\\left(x\\right)');
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
            expect(nerdamer.convertFromLaTeX('\\sfrac{6}{2}').toTeX()).toEqual('3');
        });
    });
    describe('amsmath', () => {
        it('\\text in math', () => {
            expect(nerdamer.convertFromLaTeX('2 + 3 \\text{ (an example)}')).toEqual('5');
        });
    });
});
