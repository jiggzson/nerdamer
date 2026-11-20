import Decimal from 'decimal.js';

import { Expression } from '../../src/core/classes/expression/Expression';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import nerdamer from '../../src/index';

/** The solutions of solve(source, x), as their text forms. */
function solutions(source: string): string[] {
	return nerdamer(`solve(${source},x)`).text().slice(1, -1).split(', ');
}

describe('solve(f(u)^n = c)', () => {
	it('keeps every n-th root of c', () => {
		expect(nerdamer('solve(log(x)^2-1,x)').text()).toEqual('{e, e^-1}');
		expect(nerdamer('solve(tan(x)^2-3,x)').text()).toEqual('{(1/3)*pi+_n*pi, (-1/3)*pi+_n*pi}');
		expect(nerdamer('solve(cot(x)^2-3,x)').text()).toEqual('{(1/6)*pi+_n*pi, (-1/6)*pi+_n*pi}');
		expect(solutions('tan(2*x)^2-3')).toHaveLength(2);
	});

	it('returns the complex roots too, each satisfying the equation', () => {
		// Reference values from mpmath at 30 digits: e^(2*w^k), w = e^(2*pi*i/3).
		const expected: [string, string][] = [
			['7.389056098930650227230427', '0'],
			['-0.05906544968727831047744842', '0.363106810580374939941486'],
			['-0.05906544968727831047744842', '-0.363106810580374939941486'],
		];
		const found = solutions('log(x)^3-8').map(root => {
			const value = nerdamer(root).evaluate();
			return [
				new Decimal(
					nerdamer('realpart(v)', { v: value }).evaluate().text({ decimal: true })
				),
				new Decimal(
					nerdamer('imagpart(v)', { v: value }).evaluate().text({ decimal: true })
				),
			];
		});
		expect(found).toHaveLength(3);
		for (const [re, im] of expected) {
			const match = found.some(([r, i]) =>
				r.minus(re).abs().plus(i.minus(im).abs()).lt('1e-17')
			);
			expect(match).toBe(true);
		}
		expect(solutions('tan(x)^2+3')).toHaveLength(2);
	});

	it('leaves single-inversion cases unchanged', () => {
		expect(nerdamer('solve(abs(x)^2-4,x)').text()).toEqual('{2, -2}');
		expect(nerdamer('solve(sqrt(log(x))-2,x)').text()).toEqual('{e^4}');
		expect(nerdamer('solve(sin(x)^2-1/4,x)').text()).toEqual(
			'{(1/6)*pi+2*_n*pi, (5/6)*pi+2*_n*pi, (-1/6)*pi+2*_n*pi, (7/6)*pi+2*_n*pi}'
		);
	});
});

describe('SolutionSet checks', () => {
	it('verifies a periodic family at a representative', () => {
		const set = new SolutionSet();
		set.addSolution(Expression.create('(1/3)*pi+_n*pi'), Expression.create('tan(x)^2-3'), 'x');
		set.addSolution(Expression.create('(1/5)*pi+_n*pi'), Expression.create('tan(x)^2-3'), 'x');
		expect(set.count()).toBe(1);
	});

	it('still treats numerically equal values as the same member', () => {
		const set = new SolutionSet([Expression.create('2^(1/2)'), Expression.create('sqrt(2)')]);
		expect(set.count()).toBe(1);
		const distinct = new SolutionSet([
			Expression.create('e^2'),
			Expression.create('e^(2*(-1/2+(1/2)*3^(1/2)*i))'),
		]);
		expect(distinct.count()).toBe(2);
	});
});
