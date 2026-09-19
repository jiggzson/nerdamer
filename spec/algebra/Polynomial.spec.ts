'use strict';

import { expressionToZPoly } from '../../src/core/adapters';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';

import type { Ordering, PolyType } from '../../src/core/classes/polynomial/Polynomial';
import { Term } from '../../src/core/classes/polynomial/Term';
import { divide, polyDiv, S, polyMod } from '../../src/core/classes/polynomial/utils';
import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { MOD } from '../../src/core/classes/parser/constants';
import { Vector } from '../../src/core/classes/vector/Vector';
// import { polyGCD } from '../../src/core/classes/polynomial/gcd';

const polySort = (polys: PolyType[], ordering: Ordering) => {
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

	it('builds term expressions without reinterpreting stored variables', () => {
		const variable = 'native_term_roundtrip_probe';
		const expected = Expression.create(`(a+1)*${variable}^2`);
		const term = new Term(Expression.create('a+1'), { [variable]: 2 }, [variable]);
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			expect(term.getExpression().eq(expected)).toBe(true);
		} finally {
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
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

	it('rebuilds stripped polynomial expressions without reinterpreting variables', () => {
		const variable = 'native_polynomial_roundtrip_probe';
		const left = new Polynomial(`x*${variable}`);
		const right = new Polynomial('x*y');
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			const stripped = left.stripMonomialGCD(right);

			expect(stripped.mGCD.getExpression().eq('x')).toBe(true);
			expect(stripped.p.text()).toBe(variable);
			expect(stripped.p.getExpression().eq(Expression.Variable(variable))).toBe(true);
			expect(stripped.q.getExpression().eq('y')).toBe(true);
		} finally {
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
	});

	it('keeps stored expressions synchronized after term-native polynomial operations', () => {
		const results = [
			new Polynomial('x+1').plus(new Polynomial('2*x+3')),
			new Polynomial('x+1').minus(new Polynomial('x')),
			new Polynomial('x^3+2*x').diff('x'),
			new Polynomial('6*x^2+3*x').gcdFree(),
			new Polynomial('2*x^2+4*x').monic(),
			new Polynomial('x+1').times(new Term('2', '1', ['y'])),
		];

		for (const result of results) {
			expect(result.getExpression().eq(result.text())).toBe(true);
		}
	});

	it('keeps multivariate state synchronized when polynomial operations add variables', () => {
		const results = [
			new Polynomial('x+1').plus(new Polynomial('y+1')),
			new Polynomial('x+1').minus(new Term('1', '1', ['y'])),
			new Polynomial('x+1').times(new Term('1', '1', ['y'])),
		];

		for (const result of results) {
			expect(result.variables.length).toBe(2);
			expect(result.isMultivariate).toBe(true);
		}
	});

	it('builds coefficient arrays without reparsing native expressions', () => {
		const variable = 'native_from_array_roundtrip_probe';
		const coefficient = Expression.create(`1+${variable}`);
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			const polynomial = Polynomial.fromArray([1, coefficient], ['x']);
			const linearTerm = polynomial.terms.find(term => term.deg('x') === 1);

			expect(polynomial.getExpression().variables().sort()).toEqual([variable, 'x'].sort());
			expect(linearTerm).toBeDefined();
			expect(linearTerm?.coeff.text()).toEqual(coefficient.text());
		} finally {
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
	});

	it('preserves grouped symbolic coefficients and the documented repeated base', () => {
		const symbolic = Polynomial.fromArray([1, Expression.create('a+b')], ['x']);
		const multivariate = Polynomial.fromArray([1, 2, 3], ['x', 'y']);
		const dependent = Polynomial.fromArray([0, Expression.create('x')], ['x']);

		expect(symbolic.getExpression().eq('1+(a+b)*x')).toBe(true);
		expect(multivariate.getExpression().eq('1+2*x*y+3*x^2*y^2')).toBe(true);
		expect(dependent.text()).toEqual('x^2');
	});

	it('evaluates partial polynomials without reparsing remaining variables', () => {
		const variable = 'native_polynomial_evaluate_roundtrip_probe';
		const polynomial = new Polynomial(`x*${variable}+x^2*${variable}+1`, ['x', variable]);
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			const evaluated = polynomial.evaluate({ x: 1 });
			const linearTerm = evaluated.terms.find(term => term.deg(variable) === 1);

			expect(evaluated.variables).toEqual([variable]);
			expect(evaluated.text()).toEqual(`2*${variable}+1`);
			expect(linearTerm).toBeDefined();
			expect(linearTerm?.coeff.text()).toEqual('2');
		} finally {
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
	});

	it('combines and cancels collapsed terms during native polynomial evaluation', () => {
		const combined = new Polynomial('x*y+x^2*y+1', ['x', 'y']).evaluate({ x: 1 });
		const cancelled = new Polynomial('x*y-y', ['x', 'y']).evaluate({ x: 1 });
		const constant = new Polynomial('x^2+2*x+1', ['x']).evaluate({ x: 2 });

		expect(combined.text()).toEqual('2*y+1');
		expect(cancelled.text()).toEqual('0');
		expect(constant.text()).toEqual('9');
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

	it('should apply modulus to polynomial coefficients', () => {
		const coeffs = new Polynomial('8*x^2+5*x+3').mod(3);

		expect(coeffs.getPower(2).text()).toEqual('2');
		expect(coeffs.getPower(1).text()).toEqual('2');
		expect(coeffs.getPower(0).text()).toEqual('0');
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

describe('Polynomial regressions', () => {
	// Regression: https://github.com/together-science/nerdamer-prime/issues/140
	it('uses numeric rather than lexicographic polynomial exponents', () => {
		expect(nerdamer('deg(x^12+x^2+x^3)').text()).toEqual('12');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/138
	it('makes the zero polynomial monic without division by zero', () => {
		expect(new Polynomial('0').monic().text()).toEqual('0');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/137
	it('preserves numeric polynomial content', () => {
		expect(new Polynomial('2*x^2+4*x+6').content().text()).toEqual('2');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/50
	it.each([
		['exact quotient', 'divide((x^2+2*x+1),(x+1))', 'x+1'],
		['quotient with remainder', 'divide((x^2+3*x+1),(x+1))', 'x+2-1/(x+1)'],
		['multivariate exact quotient', 'divide(x^2+x*y,x)', 'x+y'],
		['non-polynomial fallback', 'divide(sin(x),x)', 'sin(x)/x'],
	])('restores the %s divide expression', (_label, source, expected) => {
		const actual = nerdamer(source);

		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			expect(actual.eq(Expression.create(expected))).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/50
	it.each([
		['quotient with remainder', 'div((x^2+3*x+1),(x+1))', 'x+2', '-1'],
		['constant divisor', 'div(6*x+3,3)', '2*x+1', '0'],
		['multivariate exact quotient', 'div(x^2+x*y,x)', 'x+y', '0'],
		['non-polynomial fallback', 'div(sin(x),x)', '0', 'sin(x)'],
	])('restores the %s quotient/remainder pair', (_label, source, quotient, remainder) => {
		const actual = nerdamer(source);

		expect(Vector.isVector(actual)).toBe(true);
		if (Vector.isVector(actual)) {
			expect(actual.count()).toBe(2);
			const [actualQuotient, actualRemainder] = actual.elements;
			expect(Expression.isExpression(actualQuotient)).toBe(true);
			expect(Expression.isExpression(actualRemainder)).toBe(true);
			if (Expression.isExpression(actualQuotient) && Expression.isExpression(actualRemainder)) {
				expect(actualQuotient.eq(Expression.create(quotient))).toBe(true);
				expect(actualRemainder.eq(Expression.create(remainder))).toBe(true);
			}
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/211
	it('evaluates symbolic polynomial remainders', () => {
		expect(nerdamer('mod(2*x+2*y,x+y)').text()).toEqual('0');
		expect(nerdamer('mod(x^2+1,x+1)').text()).toEqual('2');
		expect(nerdamer('mod(x^2+y^2-1,y^2-1)').text()).toEqual('x^2');
		expect(nerdamer('mod(7,3)').text()).toEqual('1');

		const unevaluated = nerdamer('mod(sin(x),x)');
		expect(Expression.isExpression(unevaluated)).toBe(true);
		if (Expression.isExpression(unevaluated)) {
			expect(unevaluated.isFunction(MOD)).toBe(true);
			const args = unevaluated.getArguments();
			expect(args).toHaveLength(2);
			expect(args[0].eq('sin(x)')).toBe(true);
			expect(args[1].eq('x')).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/609
	it('extracts complex-valued polynomial coefficients', () => {
		const coefficients = Expression.create('2*x+i*x+5').coeffs('x').toArray();

		expect(coefficients).toHaveLength(2);
		expect(coefficients[0].eq(5)).toBe(true);
		expect(coefficients[1].minus('2+i').simplify().isZero()).toBe(true);
	});
});
