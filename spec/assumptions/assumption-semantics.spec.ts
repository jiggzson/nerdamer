import nerdamer from '../../src/index';
import {
	assume,
	clearAssumptions,
	getAssumptionFor,
} from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Assumption semantics', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/174
	it('retains singleton assumptions when aggregating equal inputs', () => {
		try {
			assume('x=9');

			expect(nerdamer('min(x,x)').text()).toEqual('9');
			expect(nerdamer('max(x,x)').text()).toEqual('9');
		} finally {
			clearAssumptions();
		}
	});

	it('accepts arithmetic that resolves to numeric parser assumption bounds', () => {
		try {
			Parser.parse('assume(x>1/2)');
			Parser.parse('assume(y<=1+1/2)');

			expect(getAssumptionFor('x')?.toString()).toBe('(0.5, Infinity)');
			expect(getAssumptionFor('y')?.toString()).toBe('(-Infinity, 1.5]');
			expect(() => Parser.parse('assume(z>x)')).toThrow();
		} finally {
			clearAssumptions();
		}
	});

	it('keeps the direct string grammar separate from parser-evaluated bounds', () => {
		try {
			expect(() => assume('x>1/2')).toThrow();
			Parser.parse('assume(x>1/2)');

			expect(getAssumptionFor('x')?.toString()).toBe('(0.5, Infinity)');
		} finally {
			clearAssumptions();
		}
	});

	it('preserves non-terminating rational parser bounds exactly', () => {
		try {
			Parser.parse('assume(x==1/3)');

			expect(Expression.create('x').eq('1/3')).toBe(true);
			expect(nerdamer('min(x,1/3)').text()).toBe('1/3');
			expect(nerdamer('max(x,1/3)').text()).toBe('1/3');
		} finally {
			clearAssumptions();
		}
	});

	it('retains exact rational endpoints when repeated assumptions intersect', () => {
		try {
			Parser.parse('assume(x>1/3)');
			Parser.parse('assume(x<2/3)');

			const x = getAssumptionFor('x');
			expect(x?.gt(Expression.create('1/3'))).toBe(true);
			expect(x?.lt(Expression.create('2/3'))).toBe(true);
			expect(x?.contains(Expression.create('1/2').getMultiplier())).toBe(true);
		} finally {
			clearAssumptions();
		}
	});
});
