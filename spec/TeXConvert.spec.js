var nerdamer = require('../nerdamer.core.js');
it('Should convert from TeX', function () {
    expect(nerdamer.convertFromLaTeX('x^6 \\cdot cos(\\frac{1}{2})').toString()).toEqual('cos(1/2)*x^6');
    expect(nerdamer.convertFromLaTeX('\\sqrt[3]{1+a}+1').toString()).toEqual('(1+a)^(1/3)+1');
    expect(nerdamer.convertFromLaTeX('\\begin{matrix} \\begin{matrix}1 & 2 \\\\ 7 & 8\\end{matrix} & 2+9 \\\\ 7 & 8\\end{matrix}').toString())
        .toEqual('matrix([matrix([1,2],[7,8]),11],[7,8])');
    expect(nerdamer.convertFromLaTeX('\\int_{0}^{\\pi}(\\sin(y)),y').toString()).toEqual('defint(sin(y),0,pi,y)');
});
