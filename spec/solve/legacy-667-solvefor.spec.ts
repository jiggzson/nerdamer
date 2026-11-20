import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { subst, uSub } from '../../src/core/functions/subst';
// Registers solveFor on Expression.
import '../../src/index';

describe('legacy #667 solveFor', () => {
	it('solves the original equation for its four real roots', () => {
		const sum = '(-abs(-y^2+1/2)-y^2+1/2)^(1/3)+(-y^2+1/2+abs(-y^2+1/2))^(1/3)';
		const rotation = '((1/2)*i*sqrt(3)+1/2)';
		const source = `((${sum})*${rotation}^2)^3-1+2*(${sum})^2*${rotation}^4`;
		const expression = Expression.create(source);
		const roots = String(expression.solveFor('y'))
			.replace(/[{}]/g, '')
			.split(',')
			.map(root => root.trim());
		expect(roots).toHaveLength(4);
		const sorted = roots.map(Number).sort((a, b) => a - b);
		expect(sorted[0]).toBeCloseTo(-(1 + Math.sqrt(5)) / 2, 12);
		expect(sorted[1]).toBeCloseTo(-1, 12);
		expect(sorted[2]).toBeCloseTo(1, 12);
		expect(sorted[3]).toBeCloseTo((1 + Math.sqrt(5)) / 2, 12);
		for (const root of roots) {
			const residual = expression.evaluate({ y: root });
			expect(Expression.isExpression(residual) && residual.isNearlyZero()).toBe(true);
		}
	}, 30000);

	it('records a substitution only when it happened', () => {
		const [unchanged, empty] = uSub('x^2+1', 'cos(x)');
		expect(unchanged.text()).toBe('1+x^2');
		expect(Object.keys(empty)).toHaveLength(0);
		const [changed, map] = uSub('cos(x)^2+cos(x)+1', 'cos(x)');
		expect(changed.text()).toBe('1+u0+u0^2');
		expect(map.u0.text()).toBe('cos(x)');
		// A shared map reuses the symbol for the same value.
		const [again, shared] = uSub('cos(x)+x', 'cos(x)', map);
		expect(again.text()).toBe('x+u0');
		expect(Object.keys(shared)).toEqual(['u0']);
	});

	it.each([
		['x*(1+y)-x*y', 'x', '2', '2'],
		['(x+i)^2', 'i', 'z', '(x+z)^2'],
		['sin(x)+x', 'x', 'u', 'sin(u)+u'],
	])('substitutes inside %s for the variable %s', (source, value, replacement, expected) => {
		const result = subst(source, value, replacement);
		expect(result.minus(Expression.create(expected)).expand().isZero()).toBe(true);
	});

	it.each([
		['1+2*i', '1+2*i', true],
		['1+2*i', '1-2*i', false],
		['(1+i)^2', '2*i', true],
		['x+i', 'x+i', true],
		['x+i', 'x-i', false],
	])('compares %s with %s', (a, b, expected) => {
		expect(Expression.create(a).eq(Expression.create(b))).toBe(expected);
	});
});
