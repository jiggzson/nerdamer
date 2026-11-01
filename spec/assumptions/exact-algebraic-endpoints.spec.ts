import { Assumption } from '../../src/core/classes/assumption/Assumption';
import { clearAssumptions, getAssumptionFor } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import '../helpers/registerNerdamerFunctions';

// Exact irrational endpoints must not be rounded before proving bounds.
describe('exact algebraic assumption endpoints', () => {
	afterEach(() => clearAssumptions());

	it('preserves strict radical bounds and unknown comparisons', () => {
		Parser.parse('assume(x>sqrt(2))');
		const x = getAssumptionFor('x');
		expect(x).toBeDefined();
		expect(x?.gt(Expression.create(1))).toBe(true);
		expect(x?.gt(Expression.create(2))).toBeUndefined();
		expect(x?.gt(Expression.create('sqrt(2)'))).toBe(true);
		expect(x?.gte(Expression.create('sqrt(2)'))).toBe(true);
	});

	it('preserves exact irrational singleton values', () => {
		Parser.parse('assume(x=sqrt(2))');
		const x = getAssumptionFor('x');
		expect(x?.getSingletonValue()?.eq('sqrt(2)')).toBe(true);
		expect(x?.eq(Expression.create('sqrt(2)'))).toBe(true);
	});

	it('rejects a contradictory rational upper bound without destroying the prior assumption', () => {
		Parser.parse('assume(x>sqrt(2))');
		expect(() => Parser.parse('assume(x<1)')).toThrow();
		expect(getAssumptionFor('x')?.gt(Expression.create(1))).toBe(true);
	});

	it('accepts a direct exact real endpoint without collapsing to Decimal', () => {
		const bound = Expression.create('sqrt(2)');
		const interval = Assumption.atLeast(bound, false);
		expect(interval.getFiniteLowerBound()?.eq(bound)).toBe(true);
	});

	it('retains exact endpoints through intersection and singleton reduction', () => {
		Parser.parse('assume(x>=sqrt(2))');
		Parser.parse('assume(x<=sqrt(2))');
		const x = getAssumptionFor('x');
		expect(x?.isSingleton).toBe(true);
		expect(x?.getSingletonValue()?.eq('sqrt(2)')).toBe(true);
		expect(x?.toString()).toContain('2^(1/2)');
	});

	it('orders negative radicals without a rounded comparison', () => {
		Parser.parse('assume(x<=-sqrt(2))');
		const x = getAssumptionFor('x');
		expect(x?.lt(Expression.create(-1))).toBe(true);
		expect(x?.lt(Expression.create(-2))).toBeUndefined();
	});

	it('rejects unsupported endpoints instead of storing approximate proofs', () => {
		expect(() => Parser.parse('assume(x>sin(1))')).toThrow();
		expect(() => Assumption.atLeast(Expression.create('x+1'))).toThrow();
		expect(getAssumptionFor('x')).toBeUndefined();
	});

	it('does not infer false equality from separate intervals', () => {
		const first = Assumption.atLeast(Expression.create('sqrt(2)'), true);
		const second = Assumption.atMost(Expression.create('sqrt(3)'), true);
		expect(first.eq(second)).toBeUndefined();
		expect(first.gt(second)).toBeUndefined();
	});

	it('keeps existing exact rational bounds unchanged', () => {
		const rational = Assumption.exactly(Expression.create('1/3'));
		expect(rational.getSingletonValue()?.eq('1/3')).toBe(true);
		expect(rational.start.value.toString()).toBeDefined();
	});

	it('keeps nearby rational bounds distinct from the irrational endpoint', () => {
		Parser.parse('assume(x>sqrt(2))');
		expect(() => Parser.parse('assume(x<1.4142135623730950488016887242096980785)')).toThrow();
		expect(getAssumptionFor('x')?.getFiniteUpperBound()).toBeUndefined();
		Parser.parse('assume(x<1.414213562373095048801688724209698079)');
		expect(getAssumptionFor('x')?.getFiniteUpperBound()?.isNUM()).toBe(true);
	});
});
