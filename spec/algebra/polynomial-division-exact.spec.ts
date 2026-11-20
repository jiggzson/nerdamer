import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { divide } from '../../src/core/classes/polynomial/utils';

/** All orderings of the given indices. */
function permutations(items: number[]): number[][] {
	if (items.length <= 1) {
		return [items];
	}
	return items.flatMap((item, i) =>
		permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest])
	);
}

/** The Leibniz expansion of the determinant of an n x n matrix of symbols named v<row><column>. */
function leibniz(n: number, name: string): Expression {
	const terms = permutations([...Array(n).keys()]).map(p => {
		let inversions = 0;
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				if (p[i] > p[j]) {
					inversions++;
				}
			}
		}
		const sign = inversions % 2 ? '-' : '+';
		return `${sign}${p.map((column, row) => `${name}${row}${column}`).join('*')}`;
	});
	return Expression.create(terms.join(''));
}

describe('Exact multivariate polynomial division', () => {
	it.each([
		[2, 3],
		[3, 4],
		[4, 4],
	])('divides a product of determinants of sizes %i and %i exactly', (m, n) => {
		const divisor = leibniz(m, 'a');
		const quotient = leibniz(n, 'b');
		const dividend = divisor.times(quotient).expand();
		const start = performance.now();
		const [q, r] = divide(dividend, divisor);
		const elapsed = performance.now() - start;
		expect(r.isZero()).toBe(true);
		expect(q.minus(quotient).expand().isZero()).toBe(true);
		// The 576-term case took about 18 seconds before #736 and now takes well under one.
		expect(elapsed).toBeLessThan(5000);
	});

	it('keeps the expression in step with the terms after arithmetic', () => {
		const p = new Polynomial('x^2*y+3*x-1');
		const difference = p.minus(new Polynomial('x^2*y+2*x'));
		expect(difference.getExpression().text()).toBe(
			new Polynomial('x-1').getExpression().text()
		);
		const copy = new Polynomial(difference);
		expect(copy.getExpression().minus(Expression.create('x-1')).expand().isZero()).toBe(true);
		// The original is unchanged.
		expect(p.getExpression().minus(Expression.create('x^2*y+3*x-1')).expand().isZero()).toBe(
			true
		);
	});
});
