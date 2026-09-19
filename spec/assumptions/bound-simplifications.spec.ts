import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { DIRAC, HEAVISIDE, MAX, MIN } from '../../src/core/classes/parser/constants';
import { dirac, heaviside, max, min } from '../../src/math/math';

describe('Assumption bound simplifications', () => {
	afterEach(() => {
		clearAssumptions();
	});

	it('proves affine relations from a non-strict lower bound', () => {
		assume('x>=3');

		const shifted = Expression.create('x-3');
		expect(shifted.gte(0)).toBe(true);
		expect(shifted.gt(0)).toBe(false);
		expect(Expression.create('abs(x-3)').eq(Expression.create('x-3'))).toBe(true);
		expect(Expression.create('sqrt((x-3)^2)').eq(Expression.create('x-3'))).toBe(true);
		expect(Expression.create('sign(x-3)').isFunction('sign')).toBe(true);
	});

	it('proves affine relations from a non-strict upper bound', () => {
		assume('x<=3');

		const shifted = Expression.create('x-3');
		expect(shifted.lte(0)).toBe(true);
		expect(shifted.lt(0)).toBe(false);
		expect(Expression.create('abs(x-3)').eq(Expression.create('3-x'))).toBe(true);
		expect(Expression.create('sqrt((x-3)^2)').eq(Expression.create('3-x'))).toBe(true);
		expect(Expression.create('sign(x-3)').isFunction('sign')).toBe(true);
	});

	it('uses strict affine bounds for sign simplification', () => {
		assume('x>3');
		expect(Expression.create('sign(x-3)').eq(Expression.Number(1))).toBe(true);
		clearAssumptions();

		assume('x<3');
		expect(Expression.create('sign(x-3)').eq(Expression.Number(-1))).toBe(true);
	});

	it('reverses the comparison for a negative affine coefficient', () => {
		assume('x>=4');

		const affine = Expression.create('7-2*x');
		expect(affine.lt(0)).toBe(true);
		expect(Expression.create('abs(7-2*x)').eq(Expression.create('2*x-7'))).toBe(true);
		expect(Expression.create('sign(7-2*x)').eq(Expression.Number(-1))).toBe(true);
	});

	it('uses singleton assumptions in affine bounds', () => {
		assume('x=4');

		const affine = Expression.create('2*x+1');
		expect(affine.gte(9)).toBe(true);
		expect(affine.lte(9)).toBe(true);
		expect(Expression.create('x-1').gte(3)).toBe(true);
		expect(Expression.create('5-x').lte(1)).toBe(true);
	});

	it('keeps the result symbolic when the allowed interval crosses the threshold', () => {
		assume('x>=2');
		assume('x<=4');

		const shifted = Expression.create('x-3');
		expect(shifted.gte(0)).toBe(false);
		expect(shifted.lte(0)).toBe(false);
		expect(Expression.create('abs(x-3)').isFunction('abs')).toBe(true);
		expect(Expression.create('sign(x-3)').isFunction('sign')).toBe(true);
	});

	it('propagates an affine sign through products', () => {
		assume('x>3');
		assume('y>0');

		const product = Expression.create('(x-3)*y');
		expect(product.gt(0)).toBe(true);
		expect(Expression.create('abs((x-3)*y)').eq(product)).toBe(true);
	});

	it('simplifies heaviside from strict linear bounds', () => {
		assume('x>3');
		expect(heaviside(Expression.create('x-3')).eq(Expression.Number(1))).toBe(true);
		clearAssumptions();

		assume('x<3');
		expect(heaviside(Expression.create('x-3')).eq(Expression.Number(0))).toBe(true);
	});

	it('preserves the heaviside boundary unless the bound proves zero', () => {
		assume('x>=3');
		expect(heaviside(Expression.create('x-3')).isFunction(HEAVISIDE)).toBe(true);
		clearAssumptions();

		assume('x=3');
		expect(heaviside(Expression.create('x-3')).eq(Expression.create('1/2'))).toBe(true);
	});

	it('simplifies dirac only when the argument is provably nonzero', () => {
		assume('x>3');
		expect(dirac(Expression.create('x-3')).eq(Expression.Number(0))).toBe(true);
		clearAssumptions();

		assume('x<3');
		expect(dirac(Expression.create('x-3')).eq(Expression.Number(0))).toBe(true);
		clearAssumptions();

		assume('x>=3');
		expect(dirac(Expression.create('x-3')).isFunction(DIRAC)).toBe(true);
		clearAssumptions();

		assume('x=3');
		expect(dirac(Expression.create('x-3')).isFunction(DIRAC)).toBe(true);
	});

	it('simplifies min and max from one-sided bounds', () => {
		assume('x>=5');

		const x = Expression.create('x');
		expect(max(x, 5).eq(x)).toBe(true);
		expect(min(x, 5).eq(Expression.Number(5))).toBe(true);
	});

	it('orders disjoint assumed ranges', () => {
		assume('x>10');
		assume('y<5');

		const x = Expression.create('x');
		const y = Expression.create('y');
		expect(max(x, y).eq(x)).toBe(true);
		expect(min(x, y).eq(y)).toBe(true);
	});

	it('uses affine bounds in min and max', () => {
		assume('x>=4');

		const affine = Expression.create('2*x+1');
		expect(max(affine, 8).eq(affine)).toBe(true);
		expect(min(affine, 8).eq(Expression.Number(8))).toBe(true);
	});

	it('keeps min and max symbolic for overlapping ranges', () => {
		assume('x>=2');
		assume('x<=4');

		const x = Expression.create('x');
		expect(max(x, 3).isFunction(MAX)).toBe(true);
		expect(min(x, 3).isFunction(MIN)).toBe(true);
	});

	it('finds a dominant candidate even when earlier ranges overlap', () => {
		assume('x<=10');
		assume('y<=20');

		const x = Expression.create('x');
		const y = Expression.create('y');
		expect(max(x, y, 100).eq(Expression.Number(100))).toBe(true);
		clearAssumptions();

		assume('x>=10');
		assume('y>=20');
		expect(min(x, y, 0).eq(Expression.Number(0))).toBe(true);
	});
});