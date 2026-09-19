import Decimal from 'decimal.js';

import {
	assume,
	clearAssumptions,
	forgetAssumptionFor,
	getAssumptionFor,
} from '../../src/core/classes/assumption/assume';
import { Assumption } from '../../src/core/classes/assumption/Assumption';
import { Expression } from '../../src/core/classes/expression/Expression';
import { minusOne, one } from '../../src/core/classes/expression/shortcuts';
import { ALL_SYMBOL, INDEX_VARIABLE } from '../../src/core/classes/parser/constants';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Global assumptions', () => {
	afterEach(() => {
		clearAssumptions();
	});

	it('uses exact singleton assumptions to prove equality', () => {
		assume('x=9');
		assume('y=9');

		expect(Expression.create('x').eq('y')).toBe(true);
		expect(Expression.create('x').eq(9)).toBe(true);
	});

	it('keeps exact rational comparisons from inheriting Decimal rounding', () => {
		const roundedThird = new Decimal(1).div(3);
		assume('x', Assumption.exactly(roundedThird));

		const x = Expression.create('x');
		expect(x.eq('1/3')).toBe(false);
		expect(x.lt('1/3')).toBe(true);
		expect(x.gte('1/3')).toBe(false);
	});

	it('does not infer variable equality from identical admissible ranges', () => {
		assume('x>=0');
		assume('x<=9');
		assume('z>=0');
		assume('z<=9');

		expect(Expression.create('x').eq('z')).toBe(false);
		expect(Expression.create('x').eq('x')).toBe(true);
		expect(Expression.create('x').gte('x')).toBe(true);
		expect(Expression.create('x').lte('x')).toBe(true);
	});

	it('proves positive and negative comparisons conservatively', () => {
		assume('x>0');
		expect(Expression.create('x').gt(0)).toBe(true);
		expect(Expression.create('x').gte(0)).toBe(true);
		expect(Expression.create('x').eq(0)).toBe(false);
		expect(Expression.create('x').lt(0)).toBe(false);
		expect(minusOne().lt('x')).toBe(true);
		expect(one().gt('x')).toBe(false);

		assume('y<0');
		expect(Expression.create('y').lt(0)).toBe(true);
		expect(Expression.create('y').lte(0)).toBe(true);
		expect(Expression.create('y').eq(0)).toBe(false);
		expect(Expression.create('y').gt(0)).toBe(false);
	});

	it('proves non-strict bounds without incorrectly proving strict bounds', () => {
		assume('x>=0');
		assume('y<=9');

		expect(Expression.create('x').gte(0)).toBe(true);
		expect(Expression.create('x').gt(0)).toBe(false);
		expect(Expression.create('x').lt(0)).toBe(false);
		expect(Expression.create('y').lte(9)).toBe(true);
		expect(Expression.create('y').lt(9)).toBe(false);
		expect(Expression.create('y').gt(9)).toBe(false);
	});

	it('uses separated ranges to prove ordering', () => {
		assume('x>=0');
		assume('x<=9');
		assume('y>9');

		expect(Expression.create('x').lt('y')).toBe(true);
		expect(Expression.create('x').lte('y')).toBe(true);
		expect(Expression.create('y').gt('x')).toBe(true);
		expect(Expression.create('y').gte('x')).toBe(true);
		expect(Expression.create('x').eq('y')).toBe(false);
	});

	it('leaves overlapping range comparisons unresolved in the boolean Expression API', () => {
		assume('x>=0');
		assume('x<=9');
		assume('y>=5');
		assume('y<=12');

		expect(Expression.create('x').eq('y')).toBe(false);
		expect(Expression.create('x').gt('y')).toBe(false);
		expect(Expression.create('x').gte('y')).toBe(false);
		expect(Expression.create('x').lt('y')).toBe(false);
		expect(Expression.create('x').lte('y')).toBe(false);
	});

	it('intersects repeated bounds and recognizes a collapsed singleton', () => {
		assume('x>=0');
		assume('x<=0');

		const x = getAssumptionFor('x');
		expect(x?.isSingleton).toBe(true);
		expect(x?.toString()).toBe('[0, 0]');
		expect(Expression.create('x').eq(0)).toBe(true);
	});

	it('intersects open and closed repeated bounds correctly', () => {
		const cases: Array<[string, string, string]> = [
			['x>=0', 'x<=10', '[0, 10]'],
			['x>0', 'x<=10', '(0, 10]'],
			['x>=0', 'x<10', '[0, 10)'],
			['x>0', 'x<10', '(0, 10)'],
		];

		for (const [lower, upper, expected] of cases) {
			clearAssumptions();
			assume(lower);
			assume(upper);
			expect(getAssumptionFor('x')?.toString()).toBe(expected);
		}
	});

	it('tightens repeated same-side bounds independently of registration order', () => {
		assume('x>=-10');
		assume('x>2');
		assume('x<=10');
		assume('x<8');
		expect(getAssumptionFor('x')?.toString()).toBe('(2, 8)');

		clearAssumptions();
		assume('x<8');
		assume('x<=10');
		assume('x>2');
		assume('x>=-10');
		expect(getAssumptionFor('x')?.toString()).toBe('(2, 8)');
	});

	it('makes an equal repeated endpoint open if either constraint excludes it', () => {
		assume('x>=0');
		assume('x>0');
		assume('x<=10');
		assume('x<10');

		expect(getAssumptionFor('x')?.toString()).toBe('(0, 10)');
	});

	it('rejects both open forms of a collapsed interval', () => {
		assume('x>=0');
		expect(() => assume('x<0')).toThrow();

		clearAssumptions();
		assume('x>0');
		expect(() => assume('x<=0')).toThrow();
	});

	it('rejects contradictory bounds without replacing the previous assumption', () => {
		assume('x>0');
		const before = getAssumptionFor('x');

		expect(() => assume('x<=0')).toThrow();
		expect(getAssumptionFor('x')).toBe(before);
		expect(Expression.create('x').gt(0)).toBe(true);
	});

	it('supports the two-argument registration form and validates the symbol', () => {
		const interval = new Assumption(-2, 3, false, true);
		assume('x', interval);

		expect(getAssumptionFor('x')).toBe(interval);
		expect(() => assume('x+y', interval)).toThrow();
		expect(() => assume('x', 'y>0')).toThrow();
	});

	it('supports the two-argument string registration form', () => {
		assume('x', 'x>=1');
		assume('x', 'x<3');

		expect(getAssumptionFor('x')?.toString()).toBe('[1, 3)');
	});

	it('registers assumptions through the parser assertive form', () => {
		Parser.parse('assume(x>=0)');
		Parser.parse('assume(x<10)');

		expect(getAssumptionFor('x')?.toString()).toBe('[0, 10)');
		expect(Expression.create('x').gte(0)).toBe(true);
		expect(Expression.create('x').lt(10)).toBe(true);
	});

	it('supports equality aliases and negative numeric bounds through parser assumptions', () => {
		Parser.parse('assume(x>-2.5)');
		Parser.parse('assume(y==3)');

		expect(getAssumptionFor('x')?.toString()).toBe('(-2.5, Infinity)');
		expect(getAssumptionFor('y')?.isSingleton).toBe(true);
		expect(Expression.create('y').eq(3)).toBe(true);
	});

	it('keeps compound symbolic constraints outside the supported parser vocabulary', () => {
		expect(() => Parser.parse('assume(x+1>0)')).toThrow();
		expect(getAssumptionFor('x')).toBeUndefined();
	});

	it('shares assumption state across parser instances', () => {
		const parser = Parser.create();
		parser.parse('assume(x>0)');

		expect(getAssumptionFor('x')?.toString()).toBe('(0, Infinity)');
		expect(Expression.create('x').gt(0)).toBe(true);
	});

	it('rejects assumptions on built-in constants and the imaginary unit', () => {
		expect(() => assume('pi>0')).toThrow();
		expect(() => assume(`${Expression.imaginary}>0`)).toThrow();
	});

	it('rejects assumptions on restricted parser and solver sentinels', () => {
		const interval = new Assumption(0, 1);

		expect(() => assume(`${INDEX_VARIABLE}>0`)).toThrow();
		expect(() => assume(`${ALL_SYMBOL}>0`)).toThrow();
		expect(() => assume(INDEX_VARIABLE, interval)).toThrow();
		expect(() => assume(ALL_SYMBOL, interval)).toThrow();
		expect(getAssumptionFor(INDEX_VARIABLE)).toBeUndefined();
		expect(getAssumptionFor(ALL_SYMBOL)).toBeUndefined();
	});

	it('looks up and forgets assumptions through plain-variable Expression objects', () => {
		const x = Expression.create('x');
		assume('x=4');

		expect(getAssumptionFor(x)?.isSingleton).toBe(true);
		forgetAssumptionFor(x);
		expect(getAssumptionFor('x')).toBeUndefined();
	});

	it('handles assumed variables on the right side of public comparisons', () => {
		assume('x>0');

		expect(Expression.create(0).lt('x')).toBe(true);
		expect(Expression.create(0).lte('x')).toBe(true);
		expect(Expression.create(0).gt('x')).toBe(false);
		expect(Expression.create(0).gte('x')).toBe(false);
	});

	it('uses singleton assumptions in numeric aggregators', () => {
		assume('x=3');

		expect(Parser.parse('max(x,2)').text()).toBe('3');
		expect(Parser.parse('min(x,2)').text()).toBe('2');
	});

	it('returns no direct assumption for compound expressions', () => {
		assume('x>0');
		expect(getAssumptionFor(Expression.create('x+1'))).toBeUndefined();
	});

	it('forgets one assumption directly without disturbing other variables', () => {
		assume('x>0');
		assume('y<0');

		forgetAssumptionFor('x');

		expect(getAssumptionFor('x')).toBeUndefined();
		expect(getAssumptionFor('y')).toBeDefined();
	});

	it('forgets one variable or clears all assumptions through the parser API', () => {
		assume('x=0');
		assume('y=0');
		assume('z=0');

		Parser.parse('forget(x)');
		expect(getAssumptionFor('x')).toBeUndefined();
		expect(getAssumptionFor('y')).toBeDefined();
		expect(getAssumptionFor('z')).toBeDefined();

		Parser.parse('forget(all)');
		expect(getAssumptionFor('x')).toBeUndefined();
		expect(getAssumptionFor('y')).toBeUndefined();
		expect(getAssumptionFor('z')).toBeUndefined();
	});
});
