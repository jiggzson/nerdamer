import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { proveZeroRelation } from '../../src/core/classes/parser/operations/compare';

/** Keeps numeric interval comparisons independent of optional polynomial inference. */
describe('numeric assumption comparison coverage', () => {
	afterEach(() => clearAssumptions());

	it('proves a strict linear sign from a lower bound', () => {
		assume('x>5');
		expect(proveZeroRelation(Expression.create('2*x-10'), 'gt')).toBe(true);
		expect(Expression.create('2*x+3').gt('13')).toBe(true);
	});

	it('reverses a comparison with a negative coefficient', () => {
		assume('x<5');
		expect(proveZeroRelation(Expression.create('-2*x+10'), 'gt')).toBe(true);
		expect(Expression.create('-2*x+3').gt('-7')).toBe(true);
	});

	it('recognizes an identically zero linear expression from an exact bound', () => {
		assume('x=5');
		expect(proveZeroRelation(Expression.create('2*x-10'), 'eq')).toBe(true);
		expect(proveZeroRelation(Expression.create('2*x-10'), 'gt')).toBe(false);
	});

	it('retains non-strict numeric comparisons at a closed boundary', () => {
		assume('x>=5');
		expect(Expression.create('2*x+3').gte('13')).toBe(true);
	});

	it('leaves insufficient bounds unresolved in sign inference', () => {
		assume('x>=0');
		expect(proveZeroRelation(Expression.create('x-5'), 'gt')).toBeUndefined();
	});
});
