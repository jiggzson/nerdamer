/* global expect */

'use strict';

var nerdamer = require('../nerdamer.core.js');
require('../Extra');

describe('Extra Calculus', function () {

    it('should transform Laplace correctly', function () {
        expect(nerdamer('laplace(5, t, s)').toString()).toEqual('5*s^(-1)');
        expect(nerdamer('laplace(a*t, t, s)').toString()).toEqual('a*s^(-2)');
        expect(nerdamer('laplace(cos(a*t), t, s)').toString()).toEqual('(a^2+s^2)^(-1)*s');
        expect(nerdamer('laplace(cos(x), t, s)').toString()).toEqual('cos(x)*s^(-1)');
        expect(nerdamer('laplace(sinh(a*t), t, s)').toString()).toEqual('(-a^2+s^2)^(-1)*a');
        expect(nerdamer('laplace(a*t^2, t, s)').toString()).toEqual('2*a*s^(-3)');
        expect(nerdamer('laplace(2*sqrt(t), t, s)').toString()).toEqual('s^(-3/2)*sqrt(pi)');
        expect(nerdamer('laplace(x*e^(a*t), t, s)').toString()).toEqual('(-a+s)^(-1)*x');
        expect(nerdamer('laplace(x*(sin(a*t)-a*t*cos(a*t)), t, s)').toString()).toEqual('((a^2+s^2)^(-1)*a-((1+a^2*s^(-2))^(-2)*s^(-2)-(1+a^2*s^(-2))^(-2)*a^2*s^(-4))*a)*x');
        expect(nerdamer('laplace(sin(a*t), t, s)').toString()).toEqual('(a^2+s^2)^(-1)*a');
        expect(nerdamer('laplace(t*sin(a*t), t, s)').toString()).toEqual('2*(1+a^2*s^(-2))^(-2)*a*s^(-3)');
        expect(nerdamer('laplace(sin(a*t+b), t, s)').toString()).toEqual('(1+a^2*s^(-2))^(-1)*a*cos(b)*s^(-2)+(1+a^2*s^(-2))^(-1)*s^(-1)*sin(b)');
        expect(nerdamer('laplace(t^2*e^(a*t), t, s)').toString()).toEqual('-2*(-s+a)^(-3)');
        expect(nerdamer('laplace(6*t*e^(-9*t)*sin(6*t), t, s)').toString()).toEqual('-72*(-9-s)^(-3)*(1+36*(-9-s)^(-2))^(-2)');
        expect(nerdamer('laplace(sinh(t)*e^t, t, s)').toString()).toEqual('(-1/2)*(-s+2)^(-1)+(-1/2)*s^(-1)');
    });

    it('should invert a Laplace transform correctly', function () {
        expect(nerdamer('ilt(a/(b*x), x, t)').toString()).toEqual('a*b^(-1)');
        expect(nerdamer('ilt(a*6/(b*s^6),s,t)').toString()).toEqual('(1/20)*a*b^(-1)*t^5');
        expect(nerdamer('ilt(3*s/(4*s^2+5),s,t)').toString()).toEqual('(3/4)*cos((1/2)*sqrt(5)*t)');
        expect(nerdamer('ilt(2/(3*s^2+1),s,t)').toString()).toEqual('2*sin((1/3)*sqrt(3)*t)*sqrt(3)^(-1)');
        expect(nerdamer('ilt(5*sqrt(pi)/(3*s^(3/2)),s,t)').toString()).toEqual('(10/3)*sqrt(t)');
        expect(nerdamer('ilt(3/(7*s^2+1)^2, s, t)').toString()).toEqual('(-3/14)*cos((1/7)*sqrt(7)*t)*t+(3/2)*sin((1/7)*sqrt(7)*t)*sqrt(7)^(-1)');
        expect(nerdamer('ilt(5*s/(s^2+4)^2, s, t)').toString()).toEqual('(5/4)*sin(2*t)*t');
        expect(nerdamer('ilt(8*s^2/(2*s^2+3)^2, s, t)').toString()).toEqual('2*sin((1/2)*sqrt(6)*t)*sqrt(6)^(-1)+cos((1/2)*sqrt(6)*t)*t');
        expect(nerdamer('ilt((6*s^2-1)/(4*s^2+1)^2, s, t)').toString()).toEqual('(1/8)*sin((1/2)*t)+(5/16)*cos((1/2)*t)*t');
        expect(nerdamer('ilt((5*(sin(1)*s+3*cos(1)))/(s^2+9),s, t)').toString()).toEqual('5*cos(1)*sin(3*t)+5*cos(3*t)*sin(1)');
        expect(nerdamer('ilt(((s+1)*(s+2)*(s+3))^(-1), s, t)').toString()).toEqual('(1/2)*e^(-3*t)+(1/2)*e^(-t)-e^(-2*t)');
        expect(nerdamer('ilt(1/(s^2+s+1),s,t)').toString()).toEqual('2*e^((-1/2)*t)*sin((1/2)*sqrt(3)*t)*sqrt(3)^(-1)');
        expect(nerdamer('ilt(1/(s^2+2s+1),s,t)').toString()).toEqual('e^(-t)*t');
    });

    it('should calculate mode correctly', function () {
        expect(nerdamer('mode(r,r,r,r)').toString()).toEqual('r');
        expect(nerdamer('mode(1,2)').toString()).toEqual('mode(1,2)');
        expect(nerdamer('mode(1,2,3,1,2)').toString()).toEqual('mode(1,2)');
        expect(nerdamer('mode(1,1,2)').toString()).toEqual('1');
        expect(nerdamer('mode(a,a,b,c,a,b,d)').toString()).toEqual('a');
        expect(nerdamer('mode(x, r+1, 21, tan(x), r+1)').toString()).toEqual('1+r');
        expect(nerdamer('mode(x, r+1, 21, tan(x), r+1, x)').toString()).toEqual('mode(1+r,x)');
    });
});
    