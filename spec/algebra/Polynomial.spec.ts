'use strict';

import { expressionToZPoly } from '../../src/core/adapters';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { Term } from '../../src/core/classes/polynomial/Term';
import { divide, polyDiv, S, polyMod } from '../../src/core/classes/polynomial/utils';
// import { polyGCD } from '../../src/core/classes/polynomial/gcd';

const polySort = (polys, ordering) => {
	const m = polys.map(x => {
		return Polynomial.toPolynomial(x, ordering);
	});
	return Polynomial.polyArraySort(m, ordering);
};

describe('Term', () => {
	it('should render Terms text correctly', () => {
		expect(new Term('8', '1,2', ['x', 'y']).text()).toEqual('8*x*y^2');
		expect(new Term('0', '1,2', ['x', 'y']).text()).toEqual('0');
		expect(new Term('1', '1,2', ['x', 'y']).text()).toEqual('x*y^2');
		expect(new Term('-1', '1,2', ['x', 'y']).text()).toEqual('-x*y^2');
		expect(new Term('-1', '0,2', ['x', 'y']).text()).toEqual('-y^2');
		expect(new Term('-1', '0,0', ['x', 'y']).text()).toEqual('-1');
		expect(new Term('1', '0,0', ['x', 'y']).text()).toEqual('1');
	});

	it('should determine if two Terms divide correctly', () => {
		expect(new Term('-1', '1,2', ['x', 'y']).divides(new Term('-1', '1,2', ['x', 'y']))).toBe(
			true
		);
		expect(new Term('-1', '1,2', ['x', 'y']).divides(new Term('-1', '1,3', ['x', 'y']))).toBe(
			true
		);
		expect(new Term('-1', '1,3', ['x', 'y']).divides(new Term('-1', '1,2', ['x', 'y']))).toBe(
			false
		);
		expect(
			new Term('-1', '1,1,2', ['z', 'x', 'y']).divides(new Term('-1', '1,2', ['x', 'y']))
		).toBe(false);
		expect(
			new Term('-1', '1,2', ['x', 'y']).divides(new Term('-1', '1,2,1', ['x', 'y', 'z']))
		).toBe(true);
	});

	it('should divide Terms correctly', () => {
		expect(
			new Term('15', '1,2', ['x', 'y']).div(new Term('5', '1,2', ['x', 'y'])).text()
		).toEqual('3');
		expect(
			new Term('5', '1,2', ['x', 'y']).div(new Term('5', '1,2', ['x', 'y'])).text()
		).toEqual('1');
		expect(
			new Term('30', '3,2', ['x', 'y']).div(new Term('5', '1,0', ['x', 'y'])).text()
		).toEqual('6*x^2*y^2');
		expect(
			new Term('4', '1,3', ['x', 'y']).div(new Term('2', '1,1', ['y', 'x'])).text()
		).toEqual('2*y^2');
		expect(
			new Term('4', '1,1,3', ['a', 'x', 'y']).div(new Term('2', '1,1', ['y', 'x'])).text()
		).toEqual('2*a*y^2');
	});

	it('should multiply Terms correctly', () => {
		expect(
			new Term('4', '1,3', ['x', 'y']).times(new Term('2', '1,1', ['y', 'x'])).text()
		).toEqual('8*x^2*y^4');
		expect(
			new Term('4', '1,1,3', ['a', 'x', 'y'])
				.times(new Term('2', '1,1,2', ['y', 'x', 'b']))
				.text()
		).toEqual('8*a*b^2*x^2*y^4');
	});

	it('should calculate the LCM of Terms correctly', () => {
		expect(
			new Term('24', '3,2,1', ['x', 'y', 'z'])
				.LCM(new Term('30', '2,3,4', ['x', 'y', 'z']))
				.text()
		).toEqual('x^3*y^3*z^4');
		expect(
			new Term('18', '2,2,3', ['x', 'y', 'z'])
				.LCM(new Term('16', '1,2,2', ['x', 'y', 'z']))
				.text()
		).toEqual('x^2*y^2*z^3');
		expect(
			new Term('3', '3,2', ['x', 'y']).LCM(new Term('4', '5,4', ['x', 'y'])).text()
		).toEqual('x^5*y^4');
	});

	it('should track term lengths correctly', () => {
		expect(new Term('1', '1,0,2', ['x', 'y', 'z']).length).toEqual(2);
		expect(
			new Term('1', '1,0,2', ['x', 'y', 'z']).times(new Term('1', '1', ['y'])).length
		).toEqual(3);
	});
});

describe('Polynomials & Terms', () => {
	it('should multiply terms with polynomials', () => {
		expect(new Polynomial('a*x^2+b*x+c').times(new Term('1', '2', ['x'])).text()).toEqual(
			'a*x^4+b*x^3+c*x^2'
		);
	});
});

describe('Polynomial', () => {
	it('should throw for incorrect polynomials', () => {
		expect(() => {
			new Polynomial('1/2*a*cos(x)*x^6+a*b^4+1');
		}).toThrow();
		expect(() => {
			new Polynomial('1/2*a*z*x^6+a*b^y+1');
		}).toThrow();
		expect(() => {
			new Polynomial('(3*x^2+5*x+1)^-1');
		}).toThrow();
	});
	it('should order lex correctly', () => {
		expect(new Polynomial('x*y^4*z^2+x^2*y*z^3').lexSort().text()).toEqual(
			'x^2*y*z^3+x*y^4*z^2'
		);
		expect(new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').lexSort().text()).toEqual(
			'4*x^3+3*x^2*y^3*z^3+2*x*y^5*z^2'
		);
	});
	it('should order grlex correctly', () => {
		expect(new Polynomial('x^2*y^4*z^2+x^3*y^2*z^3').grlexSort().text()).toEqual(
			'x^3*y^2*z^3+x^2*y^4*z^2'
		);
		expect(new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').grlexSort().text()).toEqual(
			'3*x^2*y^3*z^3+2*x*y^5*z^2+4*x^3'
		);
	});
	it('should order grevlex correctly', () => {
		expect(new Polynomial('x^2*y^3*z^3+x^2*y^4*z^2').grevlexSort().text()).toEqual(
			'x^2*y^4*z^2+x^2*y^3*z^3'
		);
		expect(new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').grevlexSort().text()).toEqual(
			'2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3'
		);
	});

	it('should set ordering at creation', () => {
		expect(new Polynomial('x^2*y^3', undefined, 'grevlex').ordering).toEqual('grevlex');
		expect(new Polynomial('x^2', undefined, 'lex').ordering).toEqual('deg');
	});

	it('should transfer ordering when creating from Polynomial', () => {
		expect(new Polynomial(new Polynomial('x^2*y^3', undefined, 'grevlex')).ordering).toEqual(
			'grevlex'
		);
		expect(new Polynomial(new Polynomial('x^2', undefined, 'grevlex')).ordering).toEqual('deg');
	});

	it('should calculate the multideg correctly', () => {
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').lexSort().multideg()!.toString()
		).toEqual('3,0,0');
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').grlexSort().multideg()!.toString()
		).toEqual('2,3,3');
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').grevlexSort().multideg()!.toString()
		).toEqual('1,5,2');
	});

	it('should calculate the LC correctly', () => {
		expect(new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').lexSort().LC().text()).toEqual(
			'4'
		);
		expect(new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').grlexSort().LC().text()).toEqual(
			'3'
		);
		expect(new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').grevlexSort().LC().text()).toEqual(
			'2'
		);
	});

	it('should sort arrays based on ordering correctly', () => {
		expect(polySort(['x*y^2*z^3+2*x+x^2', 'x^2*y^2*z^2+x+y'], 'grevlex')[0].text()).toEqual(
			'x^2*y^2*z^2+x+y'
		);
		expect(polySort(['x*y^8*z^3+2*x+x^2', 'x^3*y*z+x+y'], 'lex')[0].text()).toEqual(
			'x^3*y*z+x+y'
		);
	});

	it('should calculate the LM correctly', () => {
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').lexSort().LT().getExpression().text()
		).toEqual('4*x^3');
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3')
				.grlexSort()
				.LT()
				.getExpression()
				.text()
		).toEqual('3*x^2*y^3*z^3');
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3')
				.grevlexSort()
				.LT()
				.getExpression()
				.text()
		).toEqual('2*x*y^5*z^2');
	});

	it('should calculate the LM correctly', () => {
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3').lexSort().LT().getExpression().text()
		).toEqual('4*x^3');
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3')
				.grlexSort()
				.LT()
				.getExpression()
				.text()
		).toEqual('3*x^2*y^3*z^3');
		expect(
			new Polynomial('2*x*y^5*z^2+3*x^2*y^3*z^3+4*x^3')
				.grevlexSort()
				.LT()
				.getExpression()
				.text()
		).toEqual('2*x*y^5*z^2');
	});

	it('should perform multivariate polynomial long division', () => {
		expect(
			divide(
				'6*a*x*b*c+15*a*x*b*e+9*a*x^3*b+2*a*x^2*b*c+5*a*x^2*b*e+3*a*x^4*b+4*b*a*c+10*b*a*e+6*b*a*x^2',
				'4*a*b*c+10*a*b*e+6*a*b*x^2+2*a*b*x*c+5*a*b*x*e+3*a*b*x^3',
				'lex'
			).toString()
		).toEqual('1+x,0');
		expect(divide('-b^2+(a*x)^2', 'a*x-b', 'lex').toString()).toEqual('b+a*x,0');
		expect(
			divide(
				'a*b^7*x^8*y^2+6*a^3*x^7*y-3*b^8*x^2*y-b^7*x*y-18*a^2*b*x-6*a^2',
				'a*x^7*y-3*x*b-1',
				'grlex'
			).toString()
		).toEqual('6*a^2+b^7*x*y,0');
		expect(divide('x^3+2*x^2*b+3*a*x^2+6*a*b*x', 'x+2*b', 'grlex').toString()).toEqual(
			'x^2+3*a*x,0'
		);
		expect(divide('5*x^3+10*x^2*b+8*a*x+16*a*b', 'x+2*b', 'grlex').toString()).toEqual(
			'5*x^2+8*a,0'
		);
		expect(divide('x^2*y+1', 'x*y+1', 'grlex').toString()).toEqual('x,1-x');
		expect(divide('a^2-b^2+x+y', 'a+b', 'grlex').toString()).toEqual('a-b,x+y');
	});

	it('should perform univariate polynomial long division', () => {
		expect(divide('2*x+3*x^2+x^3', 'x+1').toString()).toEqual('2*x+x^2,0');
		expect(divide('x+1', 'x').toString()).toEqual('1,1');
		expect(divide('x', '3', 'lex').toString()).toEqual('(1/3)*x,0');
		expect(divide('5', '3').toString()).toEqual('5/3,0');
	});

	it('should perform multivariate division with multiple divisors', () => {
		expect(polyDiv(['x*y-1', 'y^2-1'], 'x^2*y+x*y^2+y^2').toString()).toEqual('x+y,1,x+y+1');
		expect(polyDiv(['y^2-1', 'x*y-1'], 'x^2*y+x*y^2+y^2').toString()).toEqual('1+x,x,1+2*x');
		expect(polyDiv(['x*y-1', 'y^2-1'], 'x*y^2-x').toString()).toEqual('y,0,-x+y');
	});

	it('should calculate the S-polynomial correctly', () => {
		expect(S('x^3*y^2-x^2*y^3+x', '3*x^4*y+y^2', 'grlex').text()).toEqual(
			'-x^3*y^3-1/3*y^3+x^2'
		);
		expect(S('y-x^2', 'z-x^3', 'lex', ['y', 'z', 'x']).text()).toEqual('-x*y+z');
	});

	it('should calculate the polyMod correctly', () => {
		expect(polyMod('x^2+y^2-1', 'y^2-1').text()).toEqual('x^2');
		expect(polyMod('x^2-y^2-3', 'y^2-1').text()).toEqual('x^2-4');
		expect(polyMod('x^3', 'x-2*y^2').text()).toEqual('8*y^6');
	});

	it('should calculate the gcd free polynomial correctly', () => {
		expect(new Polynomial('y^4-y').gcdFree().text()).toEqual('y^4-y');
		expect(new Polynomial('3*y*x-6*y*x^2').gcdFree(true, true).text()).toEqual('2*x-1');
		expect(new Polynomial('3*x-3*y+6').gcdFree().text()).toEqual('x-y+2');
		expect(new Polynomial('3*x-3*y+7').gcdFree().text()).toEqual('3*x-3*y+7');
	});

	it('should calculate the content correctly', () => {
		expect(new Polynomial('3*x-3*y+6').content().text()).toEqual('3');
		expect(new Polynomial('3*x-3*y+7').content().text()).toEqual('1');
	});
});

describe('MultiPoly', () => {
	it('should convert from Q to Z', () => {
		const { zPoly, content, denominator } = expressionToZPoly(
			'(2*x^3)/3-(169*x^2)/15-(37*x)/6+1/2'
		);
		expect(zPoly.text()).toEqual('20*x^3-338*x^2-185*x+15');
		expect(content.text()).toEqual('1');
		expect(denominator.text()).toEqual('30');
	});
});
