import { Expression } from '../../src/core/classes/expression/Expression';
import { loadPolynomialFunctions } from '../../src/core/classes/polynomial/dispatch';
import { setComparisonInference } from '../../src/core/classes/parser/operations/compare';
import {
	clearAssumptions,
	registerSymbolRelation,
	assume,
} from '../../src/core/classes/assumption/assume';

/** Existing Expression comparisons consult symbolic facts without altering unknown results. */
describe('expression symbolic relationship comparisons', () => {
	beforeAll(() => loadPolynomialFunctions());
	afterAll(() => setComparisonInference());
	afterEach(() => clearAssumptions());

	it('uses transitive symbolic inequalities', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		registerSymbolRelation({ left: 'y', operator: '>=', right: 'z' });
		const x = Expression.create('x');
		const z = Expression.create('z');
		expect(x.gt(z)).toBe(true);
		expect(x.gte(z)).toBe(true);
		expect(z.lt(x)).toBe(true);
		expect(z.lte(x)).toBe(true);
		expect(z.gt(x)).toBe(false);
		expect(x.eq(z)).toBe(false);
	});

	it('uses transitive relationships in polynomial expressions', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		registerSymbolRelation({ left: 'y', operator: '>=', right: 'z' });
		expect(Expression.create('2*x+3').gt('2*z+3')).toBe(true);
		expect(Expression.create('-3*x+1').lt('-3*z+1')).toBe(true);
		expect(Expression.create('x^2+2*x').gt('x^2+2*z')).toBe(true);
	});

	it('uses known symbolic equality for expression comparisons', () => {
		registerSymbolRelation({ left: 'a', operator: '=', right: 'b' });
		const a = Expression.create('a');
		const b = Expression.create('b');
		expect(a.eq(b)).toBe(true);
		expect(b.eq(a)).toBe(true);
		expect(a.gte(b)).toBe(true);
		expect(a.gt(b)).toBe(false);
	});

	it('uses symbolic order when numeric intervals overlap', () => {
		assume('x>=0');
		assume('x<=10');
		assume('y>=0');
		assume('y<=10');
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		const x = Expression.create('x');
		const y = Expression.create('y');
		expect(x.gt(y)).toBe(true);
		expect(x.gte(y)).toBe(true);
		expect(y.lt(x)).toBe(true);
		expect(y.lte(x)).toBe(true);
		expect(y.gt(x)).toBe(false);
		expect(x.eq(y)).toBe(false);
	});

	it('preserves numeric comparisons for unrelated symbols', () => {
		assume('a>5');
		assume('b<2');
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('a').gt(Expression.create('b'))).toBe(true);
	});

	it('cancels matching numeric offsets for symbolic ordering', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		const xPlusOne = Expression.create('x+1');
		const yPlusOne = Expression.create('y+1');
		expect(xPlusOne.gt(yPlusOne)).toBe(true);
		expect(xPlusOne.gte(yPlusOne)).toBe(true);
		expect(yPlusOne.lt(xPlusOne)).toBe(true);
		expect(yPlusOne.lte(xPlusOne)).toBe(true);
		expect(xPlusOne.eq(yPlusOne)).toBe(false);
	});

	it('does not cancel offsets across scaled sums', () => {
		registerSymbolRelation({ left: 'x', operator: '=', right: 'y' });
		expect(Expression.create('2*(x+1)').eq(Expression.create('y+1'))).toBe(false);
		expect(Expression.create('2*(x+1)').eq(Expression.create('x+1'))).toBe(false);
	});

	it('preserves strict order under a matching positive coefficient', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('2*x').gt('2*y')).toBe(true);
		expect(Expression.create('2*x').gte('2*y')).toBe(true);
		expect(Expression.create('2*y').lt('2*x')).toBe(true);
		expect(Expression.create('2*x').eq('2*y')).toBe(false);
	});

	it('reverses inequalities under a matching negative coefficient', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('-x').lt('-y')).toBe(true);
		expect(Expression.create('-x').lte('-y')).toBe(true);
		expect(Expression.create('-y').gt('-x')).toBe(true);
		expect(Expression.create('-x').gt('-y')).toBe(false);
	});

	it('preserves equality under a matching negative coefficient', () => {
		registerSymbolRelation({ left: 'x', operator: '=', right: 'y' });
		expect(Expression.create('-2*x').eq('-2*y')).toBe(true);
		expect(Expression.create('-2*x').gte('-2*y')).toBe(true);
	});

	it('compares linear expressions with matching positive coefficients and offsets', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('2*x+3').gt('2*y+3')).toBe(true);
		expect(Expression.create('2*x+3').gte('2*y+3')).toBe(true);
		expect(Expression.create('2*y+3').lt('2*x+3')).toBe(true);
		expect(Expression.create('2*y+3').lte('2*x+3')).toBe(true);
		expect(Expression.create('2*x+3').eq('2*y+3')).toBe(false);
	});

	it('reverses order for linear expressions with matching negative coefficients', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('-2*x+3').lt('-2*y+3')).toBe(true);
		expect(Expression.create('-2*x+3').lte('-2*y+3')).toBe(true);
		expect(Expression.create('-2*y+3').gt('-2*x+3')).toBe(true);
		expect(Expression.create('-2*x+3').gt('-2*y+3')).toBe(false);
	});

	it('preserves symbolic equality with matching linear coefficients and offsets', () => {
		registerSymbolRelation({ left: 'x', operator: '=', right: 'y' });
		expect(Expression.create('2*x+3').eq('2*y+3')).toBe(true);
		expect(Expression.create('-2*x+3').eq('-2*y+3')).toBe(true);
	});

	it('does not equate linear expressions with unequal coefficients or offsets', () => {
		registerSymbolRelation({ left: 'x', operator: '=', right: 'y' });
		expect(Expression.create('2*x+3').eq('3*y+3')).toBe(false);
		expect(Expression.create('2*x+3').eq('2*y+4')).toBe(false);
	});

	it('proves polynomial ordering after shared nonlinear terms cancel', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('x^2+3*x+5').gt('x^2+3*y+5')).toBe(true);
		expect(Expression.create('x^2-2*x+5').lt('x^2-2*y+5')).toBe(true);
	});

	it('does not recurse into polynomial inference during division', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		const x = Expression.create('x');
		const y = Expression.create('y');
		expect(x.gt(y)).toBe(true);
		expect(Expression.create('2*x+3').gt('2*y+3')).toBe(true);
		expect(Expression.create('x^2+3*x+5').gt('x^2+3*y+5')).toBe(true);
		expect(Expression.create('x^2').gt('y^2')).toBe(false);
		expect(x.gt(y)).toBe(true);
	});

	it('does not infer the sign of a quadratic difference without additional bounds', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('x^2').gt('y^2')).toBe(false);
	});

	it('does not infer order from unequal coefficients', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('2*x').gt('3*y')).toBe(false);
	});

	it('does not infer ordering when numeric offsets differ', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		expect(Expression.create('x+1').gt(Expression.create('y+2'))).toBe(false);
	});

	it('cancels equal offsets for symbolic equality', () => {
		registerSymbolRelation({ left: 'a', operator: '=', right: 'b' });
		expect(Expression.create('a+3').eq(Expression.create('b+3'))).toBe(true);
	});

	it('leaves unrelated expressions on their existing comparison path', () => {
		registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
		const x = Expression.create('x');
		const unknown = Expression.create('w');
		expect(x.gt(unknown)).toBe(false);
		expect(x.eq(unknown)).toBe(false);
	});
});
