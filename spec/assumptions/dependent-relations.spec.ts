import '../../src/api/parser';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import {
	clearAssumptions, forgetAssumptionFor, getAssumptionFor, resolveAssumption, getSymbolRelations,
} from '../../src/core/classes/assumption/assume';

/** Symbolic relations retain exact differences and consult current numeric intervals. */
describe('dependent assumption relationships', () => {
	afterEach(() => clearAssumptions());

	it('retains a relation when its source variable has no numeric interval', () => {
		Parser.parse('assume(x<y+1)');
		expect(getAssumptionFor('x')).toBeUndefined();
		expect(Expression.create('x').lt('y+1')).toBe(true);
		expect(Expression.create('x').gte('y+1')).toBe(false);
		expect(getSymbolRelations()).toHaveLength(1);
	});

	it('derives strict upper bounds from existing and later assumptions', () => {
		Parser.parse('assume(x<y+1)');
		Parser.parse('assume(y<=3)');
		expect(getAssumptionFor('x')).toBeUndefined();
		expect(resolveAssumption('x')?.getFiniteUpperBound()?.eq('4')).toBe(true);
		expect(resolveAssumption('x')?.end.inclusive).toBe(false);
		expect(Expression.create('x').lt('4')).toBe(true);
		expect(Expression.create('x').lt('3')).toBe(false);
	});

	it('preserves non-strict endpoints and strict source endpoints', () => {
		Parser.parse('assume(x<=y+1)');
		Parser.parse('assume(y<=3)');
		expect(resolveAssumption('x')?.end.inclusive).toBe(true);
		expect(Expression.create('x').lte('4')).toBe(true);
		clearAssumptions();
		Parser.parse('assume(x<=y+1)');
		Parser.parse('assume(y<3)');
		expect(resolveAssumption('x')?.end.inclusive).toBe(false);
		expect(Expression.create('x').lt('4')).toBe(true);
	});

	it('uses subtraction to normalize matching variable coefficients', () => {
		Parser.parse('assume(2*x+3<2*y+5)');
		expect(Expression.create('x').lt('y+1')).toBe(true);
		Parser.parse('assume(y<=3)');
		expect(Expression.create('x').lt('4')).toBe(true);
	});

	it('reverses direction after normalizing negative coefficients', () => {
		Parser.parse('assume(-2*x+3<-2*y+5)');
		Parser.parse('assume(y>=3)');
		expect(Expression.create('x').gt('2')).toBe(true);
		expect(Expression.create('x').gt('3')).toBe(false);
	});

	it('propagates bounds across multiple symbolic relations', () => {
		Parser.parse('assume(x<y+1)');
		Parser.parse('assume(y<z+2)');
		Parser.parse('assume(z<=3)');
		expect(Expression.create('x').lt('6')).toBe(true);
		expect(Expression.create('x').lt('5')).toBe(false);
	});

	it('propagates exact equality without requiring permanent derived bounds', () => {
		Parser.parse('assume(x=y+1)');
		Parser.parse('assume(y=3)');
		expect(resolveAssumption('x')?.isSingleton).toBe(true);
		expect(resolveAssumption('x')?.getSingletonValue()?.eq('4')).toBe(true);
		expect(Expression.create('x').eq('y+1')).toBe(true);
	});

	it('preserves exact fractional differences', () => {
		Parser.parse('assume(x>y+1/3)');
		Parser.parse('assume(y>=1/3)');
		expect(resolveAssumption('x')?.getFiniteLowerBound()?.eq('2/3')).toBe(true);
		expect(resolveAssumption('x')?.start.inclusive).toBe(false);
		expect(Expression.create('x').gt('2/3')).toBe(true);
	});

	it('rejects later contradictions atomically', () => {
		Parser.parse('assume(x<y+1)');
		Parser.parse('assume(y<=3)');
		expect(() => Parser.parse('assume(x>=4)')).toThrow();
		expect(resolveAssumption('x')?.start.value.isFinite()).toBe(false);
		expect(Expression.create('x').lt('4')).toBe(true);
	});

	it('rejects contradictory dependent constraints without registering them', () => {
		Parser.parse('assume(x>=4)');
		Parser.parse('assume(y<=3)');
		expect(() => Parser.parse('assume(x<y+1)')).toThrow();
		expect(getSymbolRelations()).toHaveLength(0);
		expect(resolveAssumption('x')?.getFiniteLowerBound()?.eq('4')).toBe(true);
	});

	it('rejects contradictory cycles without losing prior relationships', () => {
		Parser.parse('assume(x<y+1)');
		expect(() => Parser.parse('assume(y<x-2)')).toThrow();
		expect(getSymbolRelations()).toHaveLength(1);
		expect(Expression.create('x').lt('y+1')).toBe(true);
	});

	it('forgets dependent facts with their source symbol', () => {
		Parser.parse('assume(x<y+1)');
		Parser.parse('assume(y<=3)');
		expect(Expression.create('x').lt('4')).toBe(true);
		forgetAssumptionFor('y');
		expect(getAssumptionFor('x')).toBeUndefined();
		expect(Expression.create('x').lt('4')).toBe(false);
		expect(getSymbolRelations()).toHaveLength(0);
	});

	it('leaves unsupported nonlinear relationships unregistered', () => {
		expect(() => Parser.parse('assume(x<y^2)')).toThrow();
		expect(getSymbolRelations()).toHaveLength(0);
		expect(getAssumptionFor('x')).toBeUndefined();
	});
});
