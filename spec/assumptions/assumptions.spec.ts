import {
	assume,
	clearAssumptions,
	getAssumptionFor,
} from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { minusOne, one } from '../../src/core/classes/expression/shortcuts';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Global assumptions', () => {
	it('point assumptions', () => {
		assume('x=9');
		assume('y=9');
		expect(Expression.create('x').gt('y')).toBe(false);
		expect(Expression.create('x').eq('y')).toBe(true);
		clearAssumptions();
	});

	it('positive values', () => {
		assume('x>0');
		expect(Expression.create('x').gt(0)).toBe(true);
		expect(Expression.create('x').eq(0)).toBe(false);
		expect(minusOne().lt('x')).toBe(true);
		expect(one().gt('x')).toBe(false);
		clearAssumptions();
	});

	it('negative values', () => {
		assume('x<0');
		expect(Expression.create('x').lt(0)).toBe(true);
		expect(Expression.create('x').eq(0)).toBe(false);
		expect(minusOne().lt('x')).toBe(false);
		expect(one().gt('x')).toBe(true);
		clearAssumptions();
	});

	it('range', () => {
		assume('x>=0');
		assume('x<=9');
		assume('y>9');
		assume('z>=0');
		assume('z<=9');
		expect(Expression.create('x').gt('y')).toBe(false);
		expect(Expression.create('x').lt('y')).toBe(true);
		expect(Expression.create('x').eq('y')).toBe(false);
		expect(Expression.create('x').eq('z')).toBe(true);
		clearAssumptions();
	});

	it('setting and forgetting', () => {
		assume('x=0');
		assume('y=0');
		assume('z=0');
		expect(getAssumptionFor('x')).not.toBe(undefined);
		expect(getAssumptionFor('y')).not.toBe(undefined);
		expect(getAssumptionFor('z')).not.toBe(undefined);
		Parser.parse('forget(x)');
		expect(getAssumptionFor('x')).toBe(undefined);
		expect(getAssumptionFor('y')).not.toBe(undefined);
		expect(getAssumptionFor('z')).not.toBe(undefined);
		Parser.parse('forget(all)');
		expect(getAssumptionFor('x')).toBe(undefined);
		expect(getAssumptionFor('y')).toBe(undefined);
		expect(getAssumptionFor('z')).toBe(undefined);
	});
});
