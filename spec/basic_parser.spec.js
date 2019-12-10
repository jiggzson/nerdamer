/* global expect */

'use strict';

var utils = require('./support/utils');
var parse = utils.parse;
var _$ = utils.toFixed;

describe('Basic operations', function() {
    it('should add correctly', function(){expect(parse('1+1')).toEqual(2);});
    it('should subtract correctly', function(){expect(parse('3-1')).toEqual(2);});
    it('should divide correctly', function(){expect(parse('6/3')).toEqual(2);});
    it('should multiply correctly', function(){expect(parse('2*6')).toEqual(12);});
    it('should raise to power correctly', function(){expect(parse('2^3')).toEqual(8);});
    it('should parse scientific notation correctly', function(){expect(parse('1.234e+1')).toEqual(12.34);});
    it('should parse non-normalized scientific notation correctly', function(){expect(parse('12.3e-1')).toEqual(1.23);});
});

describe('Order of precedence', function() {
    it('should recognize * > +', function(){expect(parse('3*5+3')).toEqual(18);});
    it('should recognize + = -', function(){expect(parse('4+5-11')).toEqual(-2);});
    it('should recognize ^ = +', function(){expect(parse('2^3-3')).toEqual(5);});
    it('should recognize ^ > *', function(){expect(parse('2^3*3')).toEqual(24);});
    it('should recognize / = *', function(){expect(parse('6/3*5')).toEqual(10);});
    it('should recognize / = +', function(){expect(_$(parse('2/3+2/3'))).toEqual(_$(1.3333333333333333));});
    it('should recognize ^ is right associative', function(){expect(parse('2^3^2')).toEqual(512);});
});

describe('Percentages', function() {
    it('should calculate percentages', function(){expect(parse('5%')).toEqual(0.05);});
    it('should add percentages', function(){expect(parse('5%+5%')).toEqual(0.1);});
    it('should multiply percentages', function(){expect(parseFloat(parse('10%*10%').toFixed(2))).toEqual(0.01);});
    it('should multiply percentages by numbers', function(){expect(parse('100*10%')).toEqual(10);});
});

describe('Functions', function() {
    it('should calculate functions', function(){expect(_$(parse('sin(1)'))).toEqual(_$(0.8414709848078965));});
    it('should calculate functions', function(){expect(_$(parse('sin(sin(2))'))).toEqual(_$(0.7890723435728884));});
    it('should add with functions', function(){expect(_$(parse('sin(sin(2))+4'))).toEqual(_$(4.789072343572888));});
    it('should handle function with arguments', function(){expect(parse('max(4,6,3)')).toEqual(6);});
    it('should handle function with arguments with operations', function(){expect(parse('max(4,5+7,3)')).toEqual(12);});
    it('should handle function with arguments with operations and subsequent operations', 
        function(){expect(parse('max(4,5+7,3)+11')).toEqual(23);}
    );
});

describe('Modulus', function() {
    it('should calculate modulus', function(){expect(parse('10%4')).toEqual(2);});
    it('should add with modulus', function(){expect(parse('10%4+6')).toEqual(8);});
    it('should multiply with modulus', function(){expect(parse('10%4*8')).toEqual(16);});
    it('should add and multiply with modulus', function(){expect(parse('2+10%4*8')).toEqual(18);});
    it('should respect modulus in functions', function(){expect(parse('max(3,2+10%4*8,5)')).toEqual(18);});
    it('should respect modulus with percentages', function(){expect(parse('8000%%8')).toEqual(0);});
    it('should correctly handle modulus left assoc', function(){expect(parse('3*3%9')).toEqual(0);});
});

describe('Brackets', function() {
    it('should respect parentheses', function(){expect(parse('4*(2+1)')).toEqual(12);});
    it('should respect parentheses within parentheses', function(){expect(parse('3*(4+(2+1))')).toEqual(21);});
    it('should recognize vectors', function(){expect(parse('[1,2,[3,4]]').toString()).toEqual('[1,2,[3,4]]');});
    it('should handle multiple levels of brackets', function() {expect(parse('((((((((9))))))))+1')).toEqual(10);});
    it('should handle multiple levels of brackets', function() {expect(parse('((((((1+1))+4)))+3)')).toEqual(9);});
});

describe('Prefixes', function() {
    it('should correctly parse prefixes', function(){
        expect(parse('-(-3*-(4))')).toEqual(-12);
        expect(_$(parse('3^-1^-1'))).toEqual(_$(0.333333333333333));
        expect(parse('-(-1-+1)^2')).toEqual(-4);
        expect(parse('-(-1-1+1)')).toEqual(1);
        expect(parse('-(1)--(1-1--1)')).toEqual(0);
        expect(parse('-(-(1))-(--1)')).toEqual(0);
        expect(_$(parse('5^-2^-4'))).toEqual(_$(0.9043038394024115));
        expect(parse('5^---3')).toEqual(0.008);
        expect(parse('5^-(++1+--+2)')).toEqual(0.008);
        expect(parse('(5^-(++1+--+2))^-2')).toEqual(15625);
        expect(parse('(5^-3^2)')).toEqual(5.12e-7);
        expect(parse('-(--5*--7)')).toEqual(-35);
    });
});

/*
//Future TODO. The skeleton is there but currently too many specs fail
describe('Spaces', function() {
    it('should respect spaces when parsing', function(){
        expect(parse('sin 9')).toEqual(0.4121184852417566);
    });
    it('should ingore other spaces when parsing', function(){
        expect(parse('sin 9 + 11')).toEqual(11.4121184852417566);
        expect(parse('sin 9+ 11')).toEqual(11.4121184852417566);
        expect(parse('sin 9+11')).toEqual(11.4121184852417566);
        expect(parse('2* sin 9+11')).toEqual(11.824236970483513);
        expect(parse('2 * sin 9+11')).toEqual(11.824236970483513);
        expect(parse(' 2 * sin 9+11 ')).toEqual(11.824236970483513);
    });
    it('should correctly identify spaces with arguments', function(){
        expect(parse(' max( 5 , 2 , 17 ) ')).toEqual(17);
    });
    it('should correctly identify matrices with spaces', function(){
        expect(parse('[ 1, [ 3, 5, 7 ] , [1 , [2, [ 1, 2] ]] ]').toString()).toEqual('[1,[3,5,7],[1,[2,[1,2]]]]');
    });
});
*/

describe('Accessing vectors', function(){
    it('should correctly access vectors', function(){
        expect(parse('[1,[3,5,7],[1,[2,[1,2]]]][2]').toString()).toEqual('[1,[2,[1,2]]]');
        expect(parse('[1,[3,5,7],[1,[2,[1,2]]]][2][1]').toString()).toEqual('[2,[1,2]]');
        expect(parse('[1,[3,5,7],[1,[2,[1,2]]]][2][1][1]').toString()).toEqual('[1,2]');
        expect(parse('[1,[3,5,7],[1,[2,[1,2]]]][2][1][1][0]').toString()).toEqual('1');
        expect(parse('5*[1,[3,5,7],[1,[2,[1,2]]]][2][1][1][0]').toString()).toEqual('5');
        expect(parse('5*[1,[3,5,7],[1,[2,[1,2]]]][2][1][1][0]+8').toString()).toEqual('13');
    });
    it('should access ranges', function(){
        expect(parse('[1,2,3,4,5][1:4]').toString()).toEqual('[2,3,4]');
    });
    it('should access using negative indices', function(){
        expect(parse('[1,2,3,4,5][-2]').toString()).toEqual('4');
    });
    it('should not confuse vector wit accessor', function(){
        expect(parse('[[1,2],[3,4],[5,6]]').toString()).toEqual('[[1,2],[3,4],[5,6]]');
    });
});

describe('Setting vector values', function() {
   it('should set values of vectors with the assign operator', function() {
       expect(parse('[1,2][1]:x').toString()).toEqual('[1,x]');
   });
});

describe('Substitutions', function(){
    it('should substitute x', function() {expect(parse('x+1', {x: 4})).toEqual(5);});
    it('should substitute x', function() {expect(parse('2*x+1', {x: 4})).toEqual(9);});
});
