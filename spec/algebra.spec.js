/* global expect */

'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Algebra.js');

describe('Algebra', function () {
    it('should perform gcd operations correctly', function () {
        expect(nerdamer('gcd(5*x^6+5*x^5+27*x^4+27*x^3+28*x^2+28*x, 5*x^3+7*x)').toString()).toEqual('5*x^3+7*x');
        expect(nerdamer('gcd(-20+16*i,-10+8*i)').toString()).toEqual('-10+8*i');
        expect(nerdamer('gcd(2*x^2+2*x+1,x+1)').toString()).toEqual('1');
        expect(nerdamer('gcd(x^2+2*x+1,x+1)').toString()).toEqual('1+x');
        expect(nerdamer('gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, (2*x^2+8*x+5))').toString()).toEqual('2*x^2+8*x+5');
        expect(nerdamer('gcd(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3))').toString()).toEqual('3+x^3');
        expect(nerdamer('gcd(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, x^7+1)').toString()).toEqual('1+x^7');
        expect(nerdamer('gcd(1+x^2,2*x)').toString()).toEqual('1');
        expect(nerdamer('gcd(84*x^4+147*x^3+16*x^2+28*x, 44*x^5+77*x^4+16*x^3+28*x^2+12*x+21)').toString()).toEqual('4*x+7');
        expect(nerdamer('gcd(5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x)').toString()).toEqual('5*x^5+x');
        expect(nerdamer('gcd(7*x^4+7*x^3+4*x^2+5*x+1, 21*x^6+47*x^4+80*x^3+20*x^2+49*x+11)').toString()).toEqual('1+4*x+7*x^3');
        expect(nerdamer('gcd(5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x,x)').toString()).toEqual('x');
        expect(nerdamer('gcd(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3), 3+x^3)').toString()).toEqual('3+x^3');
        expect(nerdamer('gcd(a, b, c)').toString()).toEqual('gcd(a,b,c)');
        expect(nerdamer('gcd(18,12, 6)').toString()).toEqual('6');
        expect(nerdamer('gcd(3, 5, 7)').toString()).toEqual('1');
        expect(nerdamer('gcd(1/2, 1/3, 1/4)').toString()).toEqual('1/12');
        expect(nerdamer('gcd(5%, 15%, 25%)').toString()).toEqual('1/20');
        expect(nerdamer('gcd(1/a, 1/b, 1/c)').toString()).toEqual('gcd(a^(-1),b^(-1),c^(-1))');
        expect(nerdamer('gcd(2^x, 6^x)').toString()).toEqual('2^x');
        expect(nerdamer('gcd(a, b, c, gcd(x, y, z, gcd(f,gcd(g,h))))').toString()).toEqual('gcd(a,b,c,x,y,z,f,g,h)');
        expect(nerdamer('gcd(2^x, 6^x)').toString()).toEqual('2^x');
        expect(nerdamer('gcd(a,a,b,b,gcd(c,c))').toString()).toEqual('1');
        expect(nerdamer('gcd(a,a)').toString()).toEqual('a');
        expect(nerdamer('gcd(a^b,a^c)').toString()).toEqual('a');
        expect(nerdamer('gcd(a^c,b^c)').toString()).toEqual('1');
        expect(nerdamer('gcd(a^a,a^a)').toString()).toEqual('a^a');
    });
    
    it('should perform lcm operations correctly', function () {
        expect(nerdamer('lcm(5*x^6+5*x^5+27*x^4+27*x^3+28*x^2+28*x, 5*x^3+7*x)').toString()).toEqual('27*x^3+27*x^4+28*x+28*x^2+5*x^5+5*x^6');
        expect(nerdamer('lcm(-20+16*i,-10+8*i)').toString()).toEqual('-10+8*i');
        expect(nerdamer('lcm(2*x^2+2*x+1,x+1)').toString()).toEqual('(1+2*x+2*x^2)*(1+x)');
        expect(nerdamer('lcm(x^2+2*x+1,x+1)').toString()).toEqual('1+2*x+x^2');
        expect(nerdamer('lcm(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, (2*x^2+8*x+5))').toString()).toEqual('15+15*x^7+24*x+24*x^8+6*x^2+6*x^9');
        expect(nerdamer('lcm(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3))').toString()).toEqual('12*x^3+12*x^4+3*x^5+4*x^6+4*x^7+x^8');
        expect(nerdamer('lcm(6*x^9+24*x^8+15*x^7+6*x^2+24*x+15, x^7+1)').toString()).toEqual('15+15*x^7+24*x+24*x^8+6*x^2+6*x^9');
        expect(nerdamer('lcm(1+x^2,2*x)').toString()).toEqual('2*(1+x^2)*x');
        expect(nerdamer('lcm(84*x^4+147*x^3+16*x^2+28*x, 44*x^5+77*x^4+16*x^3+28*x^2+12*x+21)').toString()).toEqual('(12*x+16*x^3+28*x^2+44*x^5+77*x^4+21)*(147*x^3+16*x^2+28*x+84*x^4)*(4*x+7)^(-1)');
        expect(nerdamer('lcm(5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x)').toString()).toEqual('(1375*x^9+1430*x^8+1872*x^6+37550*x^7+47075*x^5+7150*x^12+7510*x^3+9360*x+9360*x^10)*(361*x^7+473*x^5+5*x^11+72*x^3+90*x^9+91*x)*(5*x^5+x)^(-1)');
        expect(nerdamer('lcm(7*x^4+7*x^3+4*x^2+5*x+1, 21*x^6+47*x^4+80*x^3+20*x^2+49*x+11)').toString()).toEqual('(1+4*x+7*x^3)^(-1)*(1+4*x^2+5*x+7*x^3+7*x^4)*(11+20*x^2+21*x^6+47*x^4+49*x+80*x^3)');
        expect(nerdamer('lcm(5*x^11+90*x^9+361*x^7+473*x^5+72*x^3+91*x, 7150*x^12+9360*x^10+1375*x^9+1430*x^8+37550*x^7+1872*x^6+47075*x^5+7510*x^3+9360*x,x)').toString()).toEqual('(1375*x^9+1430*x^8+1872*x^6+37550*x^7+47075*x^5+7150*x^12+7510*x^3+9360*x+9360*x^10)*(361*x^7+473*x^5+5*x^11+72*x^3+90*x^9+91*x)*(5*x^6+x^2)^(-1)*x');
        expect(nerdamer('lcm(x^8+4*x^7+4*x^6+3*x^5+12*x^4+12*x^3, (x^3+3), 3+x^3)').toString()).toEqual('(12*x^3+12*x^4+3*x^5+4*x^6+4*x^7+x^8)*(3+x^3)^2*(6*x^3+x^6+9)^(-1)');
        expect(nerdamer('lcm(a, b, c)').toString()).toEqual('a*b*c*gcd(a*b,a*c,b*c)^(-1)');
        expect(nerdamer('lcm(18,12, 6)').toString()).toEqual('36');
        expect(nerdamer('lcm(3, 5, 7)').toString()).toEqual('105');
        expect(nerdamer('lcm(1/2, 1/3, 1/4)').toString()).toEqual('1');
        expect(nerdamer('lcm(5%, 15%, 25%)').toString()).toEqual('3/4');
        expect(nerdamer('lcm(1/a, 1/b, 1/c)').toString()).toEqual('1');
        expect(nerdamer('lcm(2^x, 6^x)').toString()).toEqual('6^x');
        expect(nerdamer('lcm(a, b, c, gcd(x, y, z, gcd(f,gcd(g,h))))').toString()).toEqual('a*b*c*gcd(x,y,z,f,g,h)');
        expect(nerdamer('lcm(2^x, 6^x)').toString()).toEqual('6^x');
        expect(nerdamer('lcm(a,a,b,b,gcd(c,c))').toString()).toEqual('a^2*b^2*c*gcd(a^2*b^2,a^2*b*c,a^2*b*c,a*b^2*c,a*b^2*c)^(-1)');
        expect(nerdamer('lcm(a,a)').toString()).toEqual('a^2*gcd(a,a)^(-1)');
        expect(nerdamer('lcm(a^b,a^c)').toString()).toEqual('a^(-1+b+c)');
        expect(nerdamer('lcm(a^c,b^c)').toString()).toEqual('a^c*b^c');
        expect(nerdamer('lcm(a^a,a^a)').toString()).toEqual('a^a');
    });
    
    describe('isPoly', function () {
        it('should detect polynomials', function () {
            expect(nerdamer('51').symbol.isPoly(true)).toEqual(true);
            expect(nerdamer('x^2+1').symbol.isPoly(true)).toEqual(true);
            expect(nerdamer('51/x').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('x^2+1/x').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('y*x^2+1/x').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('y*x^2+x').symbol.isPoly(true)).toEqual(true);
            expect(nerdamer('7*y*x^2+z*x+4').symbol.isPoly(true)).toEqual(true);
            expect(nerdamer('7*y*x^2+z*x^-1+4').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('sqrt(5*x)+7').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('abs(5*x^3)-x+7').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('cos(x)^2+cos(x)+1').symbol.isPoly(true)).toEqual(false);
            expect(nerdamer('sqrt(97)x^2-sqrt(13)x+sqrt(14)x+sqrt(43)x^2+sqrt(3)*sqrt(101)').symbol.isPoly(true)).toEqual(true);
            expect(nerdamer('-5 sqrt(14)x-14x^2 sqrt(83)').symbol.isPoly(true)).toEqual(true);
        });

        it('should evaluate abs() directly', function () {
            // given
            var formula = 'abs(5*x^2)-x+11';

            // when
            var isPoly = nerdamer(formula).symbol.isPoly();

            // then
            expect(isPoly).toBeTruthy();
        });
    });

    it('should perform divisions', function () {
        expect(nerdamer('div(x^2*y^3+b*y^2+3*a*x^2*y+3*a*b, y^2+3*a)').toString()).toEqual('[b+x^2*y,0]');
        expect(nerdamer('div(x^2, x^3)').toString()).toEqual('[0,x^2]');
        expect(nerdamer('div(cos(x^2)^2+2*cos(x^2)+1, cos(x^2)+1)').toString()).toEqual('[1+cos(x^2),0]');
        expect(nerdamer('div(2*x^2+2*x+1, x+1)').toString()).toEqual('[2*x,1]');
        expect(nerdamer('div(7*x,2*x)').toString()).toEqual('[7/2,0]');
        expect(nerdamer('div(7*b*z^2+14*y*z+14*a*x^2*z-b*t*z-2*t*y-2*a*t*x^2, 7*z-t)').toString()).toEqual('[2*a*x^2+2*y+b*z,0]');
        expect(nerdamer('div(x^2+5, y-1)').toString()).toEqual('[0,5+x^2]');
        expect(nerdamer('div(4*a*x^2*y^2+4*a*y^2+b*x^2+a*x^2+b+a, x^2+1)').toString()).toEqual('[4*a*y^2+a+b,0]');
        expect(nerdamer('div(4*a*x^2*y^2+4*a*y^2+b*x^2+a*x^2+b+a+u^6+1, x^2+1)').toString()).toEqual('[4*a*y^2+a+b,1+u^6]');
        expect(nerdamer('div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x, 3*x^3-5*x-7)').toString()).toEqual('[2*x^2+5*x^6+x,0]');
        expect(nerdamer('div(sin(x)^2*tan(x)-4*cos(x)*tan(x)+cos(x)*sin(x)^2-4*cos(x)^2, sin(x)^2-4*cos(x)^2)').toString()).toEqual('[cos(x)+tan(x),-4*cos(x)*tan(x)-4*cos(x)^2+4*cos(x)^3+4*cos(x)^2*tan(x)]');
        expect(nerdamer('div(y^2*z-4*x*z+x*y^2-4*x^2, y^2-4*x^2)').toString()).toEqual('[x+z,-4*x*z-4*x^2+4*x^3+4*x^2*z]');
        expect(nerdamer('div(-5*y^2+16*a*y+5*x^4+14*a*x^2-3*a^2, 3*a-y+x^2)').toString()).toEqual('[-a+5*x^2+5*y,0]');
        expect(nerdamer('div(y^2+2*x*y+x^2,x+y)').toString()).toEqual('[x+y,0]');
        expect(nerdamer('div(x*y^2+x^2*y-y-x, x*y-1)').toString()).toEqual('[x+y,0]');
        expect(nerdamer('div(y^2*z-4*x*z+x*y^2-4*x^2+x^2, y^2-4*x^2)').toString()).toEqual('[x+z,-3*x^2+4*x^3-4*x*z+4*x^2*z]');
        expect(nerdamer('div(7*x^6*z-a*x*z+28*a*x^6*y^3-4*a^2*x*y^3+7*b*x^6-a*b*x, 4*y^3*a+z+b)').toString()).toEqual('[-a*x+7*x^6,0]');
        expect(nerdamer('div(x^2+5, cos(x)-1)').toString()).toEqual('[0,5+x^2]');
        expect(nerdamer('div((1+z), t*x+7)').toString()).toEqual('[0,1+z]');
        expect(nerdamer('div(-x^2*y-y+4*a*x^2+t+4*a+6*b, x^2+1)').toString()).toEqual('[-y+4*a,6*b+t]');
        expect(nerdamer('div(15*x^9-25*x^7-35*x^6+6*x^5+3*x^4-10*x^3-19*x^2-7*x+y, 3*x^3-5*x-7)').toString()).toEqual('[2*x^2+5*x^6+x,y]');
        expect(nerdamer('div(x^2+2*x+1+u, x+1)').toString()).toEqual('[1+x,u]');
        expect(nerdamer('div(y^3+x*y^2+x^2*y+x^3+x, x+y)').toString()).toEqual('[x^2+y^2,x]');
        expect(nerdamer('div(b*y*z+7*x^6*z-a*x*z-7*z+4*a*b*y^4+28*a*x^6*y^3-4*a^2*x*y^3-28*a*y^3+b^2*y+7*b*x^6-a*b*x-7*b, 4*y^3*a+z+b)').toString()).toEqual('[-7-a*x+7*x^6+b*y,0]');
        expect(nerdamer('div(b*y*z-a*x*z+4*a*b*y^4-4*a^2*x*y^3+b^2*y-a*b*x, 4*y^3*a+z+b)').toString()).toEqual('[-a*x+b*y,0]');
        expect(nerdamer('div(17*x^3*y+3*x^2*y+34*x+6, x^2*y+2)').toString()).toEqual('[17*x+3,0]');
        expect(nerdamer('div(b^2*y^2+2*a*b*y^2+a^2*y^2+2*b^2*x*y+4*a*b*x*y+2*a^2*x*y+b^2*x^2+2*a*b*x^2+a^2*x^2, 2*b*y^2+2*a*y^2+4*b*x*y+4*a*x*y+2*b*x^2+2*a*x^2)').toString()).toEqual('[(1/2)*a+(1/2)*b,0]');
        expect(nerdamer('div(2*a*b*x+2*a*b*y+a^2*x+a^2*y+b^2*x+b^2*y, x+y)').toString()).toEqual('[2*a*b+a^2+b^2,0]');
        expect(nerdamer('div((2x-1)(3x^2+5x-2)-7x-14,x^2+1)').toString()).toEqual('[6*x+7,-19-22*x]');
        expect(nerdamer('div(2(x+1)^5+1,x+2)').toString()).toEqual('[2+2*x^4+4*x+6*x^3+8*x^2,-1]');
        expect(nerdamer('divide(a*b^(-1)+b^(-1)*c,a+c)').toString()).toEqual('b^(-1)');
        expect(nerdamer('divide(-20+16*i,-10+8*i)').toString()).toEqual('2');
    });
    /** #3: "(a-b)^2 - (b-a)^2" not simplifying. */
    it('should simplify to 0', function () {
      // given
      var formula = '(a-b)^2-(b-a)^2';

      // when
      var result = nerdamer(formula, null, ['numer', 'expand']).toString();

      // then
      expect(result).toBe('0');
    });
    /** #40: Expected more simple solution for factoring. */
    it('should use simple factor result', function () {
      // given
      var formula = 'factor(x^2+x+1/4)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('(1/4)*(1+2*x)^2');
    });

    /** #43: Formula not expanded. */
    it('should expand formula', function () {
      // given
      var formula = 'expand((x+5)(x-3)-x^2)';

      // when
      var result = nerdamer(formula).toString();

      // then
      expect(result).toBe('-15+2*x');
    });
    it('should factor correctly', function () {
        expect(nerdamer('factor(x^2+2*x+1)').toString()).toEqual('(1+x)^2');
        expect(nerdamer('factor(x^2-y^2)').toString()).toEqual('(-y+x)*(x+y)');
        expect(nerdamer('factor(a^2*x^2-b^2*y^2)').toString()).toEqual('(-b*y+a*x)*(a*x+b*y)');
        expect(nerdamer('factor(x^2-6*x+9-4*y^2)').toString()).toEqual('(-2*y-3+x)*(-3+2*y+x)');
        expect(nerdamer('factor(b^6+3*a^2*b^4+3*a^4*b^2+a^6)').toString()).toEqual('(a^2+b^2)^3');
        expect(nerdamer('factor(b^6+12*a^2*b^4+48*a^4*b^2+64*a^6)').toString()).toEqual('((9007199254740996/2251799813685249)*a^2+b^2)^3');
        expect(nerdamer('factor(c^6+3*b^2*c^4+3*a^2*c^4+3*b^4*c^2+6*a^2*b^2*c^2+3*a^4*c^2+b^6+3*a^2*b^4+3*a^4*b^2+a^6)').toString()).toEqual('(a^2+b^2+c^2)^3');
        expect(nerdamer('factor(x^4+25*x^3+234*x^2+972*x+1512)').toString()).toEqual('(6+x)^3*(7+x)');
        expect(nerdamer('factor(x^5+32*x^4+288*x^3-418*x^2-16577*x-55902)').toString()).toEqual('(-7+x)*(11+x)^3*(6+x)');
        expect(nerdamer('factor(x^2*y*z+x*z+t*x^2*y+t*x)').toString()).toEqual('(1+x*y)*(t+z)*x');
        expect(nerdamer('factor(x^2*y+x^2)').toString()).toEqual('(1+y)*x^2');
        expect(nerdamer('factor(sqrt(4*x^2*y+4*x^2))').toString()).toEqual('2*abs(x)*sqrt(1+y)');
        expect(nerdamer('factor(x^3-1/2x^2-13/2x-3)').toString()).toEqual('(1/2)*(-3+x)*(1+2*x)*(2+x)');
        expect(nerdamer('factor(x^16-1)').toString()).toEqual('(-1+x)*(1+x)*(1+x^2)*(1+x^4)*(1+x^8)');
        expect(nerdamer('factor(-1866240-311040*x^2-3265920*x+1120*x^8+150080*x^6+17610*x^7+2026080*x^4+2509920*x^3+30*x^9+738360*x^5)').toString()).toEqual('10*(-1+x)*(1+x)*(3*x+4)*(6+x)^6');
        expect(nerdamer('factor((7x^3+4x^2+x)/(12x^3+6x^2-2x))').toString()).toEqual('(1/2)*(-1+3*x+6*x^2)^(-1)*(1+4*x+7*x^2)');
        expect(nerdamer('factor((-2x-2x^2-2))').toString()).toEqual('-2*(1+x+x^2)');
        expect(nerdamer('factor(1331*x^3*y^3+216*z^6)').toString()).toEqual('(-66*x*y*z^2+121*x^2*y^2+36*z^4)*(11*x*y+6*z^2)');
        expect(nerdamer('factor(1331*x^3*y^3-216*z^6)').toString()).toEqual('(-6*z^2+11*x*y)*(121*x^2*y^2+36*z^4+66*x*y*z^2)');
        expect(nerdamer('factor(64a^3-27b^3)').toString()).toEqual('(-3*b+4*a)*(12*a*b+16*a^2+9*b^2)');
        expect(nerdamer('factor(64*x^3+125)').toString()).toEqual('(-20*x+16*x^2+25)*(4*x+5)');
        expect(nerdamer('factor((-5*K+32)^2)').toString()).toEqual('(-32+5*K)^2');
        expect(nerdamer('factor(100)').toString()).toEqual('2^2*5^2');
        expect(nerdamer('factor(100*x)').toString()).toEqual('100*x');
        expect(nerdamer('(2*y+p)^2').toString()).toEqual('(2*y+p)^2');
    });
    it('should not have any regression to factor', function() {
        //this test will absolutely break as factor improves enough to factor this expression. For now it just serves as a safeguard
        expect(nerdamer('factor(x^a+2x^(a-1)+1x^(a-2))').toString()).toEqual('2*x^(-1+a)+x^(-2+a)+x^a');
    });
    it('should correctly determine the polynomial degree', function () {
        expect(nerdamer('deg(x^2+2*x+x^5)').toString()).toEqual('5');
        expect(nerdamer('deg(x^2+2*x+x^x)').toString()).toEqual('max(2,x)');
        expect(nerdamer('deg(x^2+2*x+cos(x))').toString()).toEqual('2');
        expect(nerdamer('deg(x^a+x^b+x^c,x)').toString()).toEqual('max(a,b,c)');
        expect(nerdamer('deg(a*x^2+b*x+c,x)').toString()).toEqual('2');
    });
    it('should correctly peform partial fraction decomposition', function () {
        expect(nerdamer('partfrac((3*x+2)/(x^2+x), x)').toString()).toEqual('(1+x)^(-1)+2*x^(-1)');
        expect(nerdamer('partfrac((17*x-53)/(x^2-2*x-15), x)').toString()).toEqual('13*(3+x)^(-1)+4*(-5+x)^(-1)');
        expect(nerdamer('partfrac((x^3+2)/(x+1)^2,x)').toString()).toEqual('(1+x)^(-2)+3*(1+x)^(-1)-2+x');
        expect(nerdamer('partfrac(x/(x-1)^2, x)').toString()).toEqual('(-1+x)^(-1)+(-1+x)^(-2)');
        expect(nerdamer('partfrac((x^2+1)/(x*(x-1)^3), x)').toString()).toEqual('(-1+x)^(-1)+2*(-1+x)^(-3)-x^(-1)');
        expect(nerdamer('partfrac((17-53)/(x^2-2*x-15), x)').toString()).toEqual('(-9/2)*(-5+x)^(-1)+(9/2)*(3+x)^(-1)');
        expect(nerdamer('partfrac(1/(x^6-1),x)').toString()).toEqual('(-1/3)*(-x+x^2+1)^(-1)+(-1/3)*(1+x+x^2)^(-1)+(-1/6)*(1+x)^(-1)+(-1/6)*(1+x+x^2)^(-1)*x+(1/6)*(-1+x)^(-1)+(1/6)*(-x+x^2+1)^(-1)*x');
        expect(nerdamer('partfrac((3*x^2-3*x-8)/((x-5)*(x^2+x-4)),x)').toString()).toEqual('(-4+x+x^2)^(-1)*x+2*(-5+x)^(-1)');
        expect(nerdamer('partfrac(15*(9+s^2)^(-1)*cos(1)+5*(9+s^2)^(-1)*s*sin(1),s)').toString()).toEqual('(15*cos(1)+5*s*sin(1))*(9+s^2)^(-1)');
    });
    it('should prime factor correctly', function () {
        expect(nerdamer('pfactor(100!)').toString()).toEqual('(11^9)*(13^7)*(17^5)*(19^5)*(23^4)*(29^3)*(2^97)*(31^3)*(37^2)*(3^48)*(41^2)*(43^2)*(47^2)*(53)*(59)*(5^24)*(61)*(67)*(71)*(73)*(79)*(7^16)*(83)*(89)*(97)');
        expect(nerdamer('pfactor(100)').toString()).toEqual('(2^2)*(5^2)');
        expect(nerdamer('pfactor(8)').toString()).toEqual('(2^3)');
        expect(nerdamer('pfactor(999999999999)').toString()).toEqual('(101)*(11)*(13)*(37)*(3^3)*(7)*(9901)');
        expect(nerdamer('pfactor(1000000005721)').toString()).toEqual('(1000000005721)');
        expect(nerdamer('pfactor(1000000005721092)').toString()).toEqual('(131)*(212044106387)*(2^2)*(3^2)');
        expect(nerdamer('pfactor(-10000000114421840327308)').toString()).toEqual('(-2^2)*(480827)*(7)*(8345706745687)*(89)');
        expect(nerdamer('pfactor(-7877474663)').toString()).toEqual('(-97)*(180871)*(449)');
        expect(nerdamer('pfactor(15!+1)').toString()).toEqual('(46271341)*(479)*(59)');
        expect(nerdamer('pfactor(15!+11!)').toString()).toEqual('(11)*(181^2)*(2^8)*(3^4)*(5^2)*(7)');
        expect(nerdamer('pfactor(product(n!,n,1,10))').toString()).toEqual('(2^38)*(3^17)*(5^7)*(7^4)');
        expect(nerdamer('pfactor(4677271)').toString()).toEqual('(2089)*(2239)');
    });
    it('should get coeffs', function () {
        expect(nerdamer('coeffs(x^2+2*x+1, x)').toString()).toEqual('[1,2,1]');
        expect(nerdamer('coeffs(a*b*x^2+c*x+d, x)').toString()).toEqual('[d,c,a*b]');
        expect(nerdamer('coeffs(t*x, x)').toString()).toEqual('[0,t]');
        expect(nerdamer('coeffs(b*(t*x-5), x)').toString()).toEqual('[-5*b,b*t]');
        expect(nerdamer('coeffs(a*x^2+b*x+c+x, x)').toString()).toEqual('[c,1+b,a]');
    });
    it('should get all coeffs', function () {
        expect(nerdamer('coeffs(x+A+1,x)').toString()).toEqual('[1+A,1]');
        expect(nerdamer.coeffs('2x+i*x+5', 'x').toString()).toEqual('[5,2+i]');
    });
    it('should calculate the line function', function () {
        expect(nerdamer('line([1,2], [3,4])').toString()).toEqual('1+x');
        expect(nerdamer('line([a1,b1], [a2,b2], t)').toString()).toEqual('(-a1+a2)^(-1)*(-b1+b2)*t-(-a1+a2)^(-1)*(-b1+b2)*a1+b1');
    });
    it('should simplify correctly', function () {
        expect(nerdamer('simplify(sin(x)^2+cos(x)^2)').toString()).toEqual('1');
        expect(nerdamer('simplify(1/2*sin(x^2)^2+cos(x^2)^2)').toString()).toEqual('(1/4)*(3+cos(2*x^2))');
        expect(nerdamer('simplify(0.75*sin(x^2)^2+cos(x^2)^2)').toString()).toEqual('(1/8)*(7+cos(2*x^2))');
        expect(nerdamer('simplify(cos(x)^2+sin(x)^2+cos(x)-tan(x)-1+sin(x^2)^2+cos(x^2)^2)').toString()).toEqual('-tan(x)+1+cos(x)');
        expect(nerdamer('simplify((x^2+4*x-45)/(x^2+x-30))').toString()).toEqual('(6+x)^(-1)*(9+x)');
        expect(nerdamer('simplify(1/(x-1)+1/(1-x))').toString()).toEqual('0');
        expect(nerdamer('simplify((x-1)/(1-x))').toString()).toEqual('-1');
        expect(nerdamer('simplify((x^2+2*x+1)/(x+1))').toString()).toEqual('1+x');
        expect(nerdamer('simplify((- x + x^2 + 1)/(x - x^2 - 1))').toString()).toEqual('-1');
        expect(nerdamer('simplify(n!/(n+1)!)').toString()).toEqual('(1+n)^(-1)');
        expect(nerdamer('simplify((17/2)*(-10+8*i)^(-1)-5*(-10+8*i)^(-1)*i)').toString()).toEqual('(-9/82)*i-125/164');
        expect(nerdamer('simplify((-2*i+7)^(-1)*(3*i+4))').toString()).toEqual('(29/53)*i+22/53');
        expect(nerdamer('simplify(((17/2)*(-5*K+32)^(-1)*K^2+(5/2)*K-125*(-5*K+32)^(-1)*K-16+400*(-5*K+32)^(-1))*(-17*(-5*K+32)^(-1)*K+80*(-5*K+32)^(-1))^(-1))').toString()).toEqual('(-35*K+4*K^2+112)*(-80+17*K)^(-1)');
        expect(nerdamer('simplify(((a+b)^2)/c)').toString()).toEqual('(a+b)^2*c^(-1)');
        expect(nerdamer('simplify(-(-5*x - 9 + 2*y))').toString()).toEqual('-2*y+5*x+9');
        expect(nerdamer('simplify(a/b+b/a)').toString()).toEqual('(a*b)^(-1)*(a^2+b^2)');
        expect(nerdamer('simplify(((2*e^t)/(e^t))+(1/(e^t)))').toString()).toEqual('(1+2*e^t)*e^(-t)');
        expect(nerdamer('simplify((-3/2)x+(1/3)y+2+z)').toString()).toEqual('(1/6)*(-9*x+12+2*y+6*z)');
    });
    it('should also simplify', function() {
        //expect(nerdamer('6/sqrt(3)')).toEqual();
    });
    it('should calculate nth roots correctly', function() {
        expect(nerdamer('roots((-1)^(1/5))').evaluate().text()).toEqual('[0.5877852522924731*i+0.809016994374947,-0.309016994374947+0.9510565162951536*i,-1,-0.309016994374948-0.9510565162951536*i,-0.5877852522924734*i+0.809016994374947]');
        expect(nerdamer('roots((2)^(1/3))').evaluate().text()).toEqual('[1.122462048309381,-1.122462048309381]');
    });
    // As mentioned by @Happypig375 in issue #219
    it('should also factor correctly', function() {
        expect(nerdamer('factor((x^2+4x+4)-y^2)').toString()).toEqual('(-y+2+x)*(2+x+y)');
        expect(nerdamer('factor(81-(16a^2-56a+49))').toString()).toEqual('-8*(-4+a)*(1+2*a)');
        expect(nerdamer('factor((9x^2-12x+4)-25)').toString()).toEqual('3*(-7+3*x)*(1+x)');
        expect(nerdamer('factor((x^2+4x+4)+x*y+2y)').toString()).toEqual('(2+x)*(2+x+y)');
        expect(nerdamer('factor((4x^2+24x+36)-14x*y-42y)').toString()).toEqual('2*(-7*y+2*x+6)*(3+x)');
        expect(nerdamer('factor(35a*b-15b+(49a^2-42a+9))').toString()).toEqual('(-3+5*b+7*a)*(-3+7*a)');
        expect(nerdamer('factor(1-6a^2+9a^4)').toString()).toEqual('(-1+3*a^2)^2');
        expect(nerdamer('factor(1-6a^2+9a^4-49b^2)').toString()).toEqual('(-1+3*a^2+7*b)*(-1-7*b+3*a^2)');
    });
    it('should complete the square', function() {
        expect(nerdamer('sqcomp(a*x^2+b*x-11*c, x)').toString()).toEqual('((1/2)*abs(b)*sqrt(a)^(-1)+sqrt(a)*x)^2+(-1/4)*(abs(b)*sqrt(a)^(-1))^2-11*c');
        expect(nerdamer('sqcomp(9*x^2-18*x+17)').toString()).toEqual('(-3+3*x)^2+8');
        expect(nerdamer('sqcomp(s^2+s+1)').toString()).toEqual('(1/2+s)^2+3/4');
    });
});
