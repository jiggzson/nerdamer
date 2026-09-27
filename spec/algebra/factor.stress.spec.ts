'use strict';

import { factor } from '../../src/algebra/factor/factor';
import { polynomialToSparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomialAdapter';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';

describe('Factor stress factorizations', () => {
	const toSparse = (expression: Expression, variables: readonly string[]) =>
		polynomialToSparsePolynomial(
			new Polynomial(expression, [...variables]),
			variables
		);

	const factorLeaves = (expression: Expression): Expression[] => {
		if (expression.isNUM()) {
			return [];
		}
		if (expression.isProduct() && expression.getPower().isOne()) {
			return expression.elementsArray().flatMap(factorLeaves);
		}
		return [expression];
	};

	const checkKnownFactors = (
		source: Expression,
		expectedFactors: readonly string[]
	) => {
		const actual = factor(source);
		const variables = source.variables().sort();
		const unmatched = [...factorLeaves(actual)];

		expect(toSparse(actual, variables).equals(toSparse(source, variables))).toBe(true);
		expect(unmatched).toHaveLength(expectedFactors.length);

		for (const expected of expectedFactors) {
			const expectedSparse = toSparse(Expression.create(expected), variables);
			const index = unmatched.findIndex(candidate =>
				toSparse(candidate, variables).equals(expectedSparse)
			);
			expect(index).toBeGreaterThanOrEqual(0);
			unmatched.splice(index, 1);
		}
		expect(unmatched).toHaveLength(0);
	};

	it('factors a degree-24 product of three dense Eisenstein polynomials', () => {
		const factors = [
			'x^8+2*x^7+2*x^6+2*x^5+2*x^4+2*x^3+2*x^2+2*x+2',
			'x^8+3*x^7+3*x^6+3*x^5+3*x^4+3*x^3+3*x^2+3*x+3',
			'x^8+5*x^7+5*x^6+5*x^5+5*x^4+5*x^3+5*x^2+5*x+5',
		];
		checkKnownFactors(
			Expression.create(factors.map(value => `(${value})`).join('*')).expand(),
			factors
		);
	});

	it('factors a degree-21 product with large non-monic coefficients', () => {
		const factors = [
			'1000003*x^8+2*x^7+2*x^6+2*x^5+2*x^4+2*x^3+2*x^2+2*x+2',
			'1000033*x^7+3*x^6+3*x^5+3*x^4+3*x^3+3*x^2+3*x+3',
			'1000037*x^6+5*x^5+5*x^4+5*x^3+5*x^2+5*x+5',
		];
		checkKnownFactors(
			Expression.create(factors.map(value => `(${value})`).join('*')).expand(),
			factors
		);
	});

	it('factors a degree-36 product into nine cyclotomic factors', () => {
		const factors = [
			'x-1',
			'x+1',
			'x^2+x+1',
			'x^2+1',
			'x^2-x+1',
			'x^6+x^3+1',
			'x^4-x^2+1',
			'x^6-x^3+1',
			'x^12-x^6+1',
		];
		checkKnownFactors(
			Expression.create(factors.map(value => `(${value})`).join('*')).expand(),
			factors
		);
	});

	it('factors three Wang factors with nonconstant leading coefficients', () => {
		const factors = [
			'(y^2+z+1)*x+y*z^2+2*y+3*z+5',
			'(y*z+z^2+2)*x+y^3+z+7',
			'(y^2*z+z+3)*x+y*z^2+y+11',
		];
		checkKnownFactors(
			Expression.create(factors.map(value => `(${value})`).join('*')).expand(),
			factors
		);
	});

	it('factors three four-variable Wang factors', () => {
		const factors = [
			'(y+z*w+1)*x+y*z+w^2+2',
			'(z+y*w+3)*x+y^2+z*w+5',
			'(w+y*z+7)*x+z^2+y*w+11',
		];
		checkKnownFactors(
			Expression.create(factors.map(value => `(${value})`).join('*')).expand(),
			factors
		);
	});

	it('factors a degree-36 product through six-way Zassenhaus recombination', () => {
		const factors = [
			'x^6+2*x^5+2*x^4+2*x^3+2*x^2+2*x+2',
			'x^6+3*x^5+3*x^4+3*x^3+3*x^2+3*x+3',
			'x^6+5*x^5+5*x^4+5*x^3+5*x^2+5*x+5',
			'x^6+7*x^5+7*x^4+7*x^3+7*x^2+7*x+7',
			'x^6+11*x^5+11*x^4+11*x^3+11*x^2+11*x+11',
			'x^6+13*x^5+13*x^4+13*x^3+13*x^2+13*x+13',
		];
		checkKnownFactors(
			Expression.create(factors.map(value => `(${value})`).join('*')).expand(),
			factors
		);
	});

	it('restores multiplicities in a degree-58 factorization', () => {
		const factors = [
			'(x^8+2*x^7+2*x^6+2*x^5+2*x^4+2*x^3+2*x^2+2*x+2)^3',
			'(x^7+3*x^6+3*x^5+3*x^4+3*x^3+3*x^2+3*x+3)^2',
			'(x^5+5*x^4+5*x^3+5*x^2+5*x+5)^4',
		];
		checkKnownFactors(
			Expression.create(factors.join('*')).expand(),
			factors
		);
	});

});
