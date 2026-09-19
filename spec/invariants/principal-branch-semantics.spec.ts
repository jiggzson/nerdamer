import nerdamer from '../../src/index';
import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Principal-branch semantics', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/465
	it('does not apply the real-invalid log power identity to even powers', () => {
		const evaluated = nerdamer('log(x^2)').evaluate();
		const negativeValue = evaluated.evaluate({ x: -2 }).text();
		const expected = nerdamer('log(4)').evaluate().text();

		expect(evaluated.text()).not.toEqual('2*log(x)');
		expect(negativeValue).toEqual(expected);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/500
	it('evaluates fractional powers inside products without collapsing to zero', () => {
		const actual = Number(nerdamer('5*(1.05)^(33.5)').evaluate().text({ decimal: true }));

		expect(actual).toBeCloseTo(25.63371333151669, 12);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/2
	it('does not pull a power across an unrelated logarithm factor', () => {
		const expression = Expression.create('log(2*((a+b)^7))');

		for (const values of [
			{ a: 1, b: 1 },
			{ a: 2, b: 1 },
		]) {
			const actual = Number(expression.evaluate(values).text({ decimal: true }));
			const expected = Math.log(2 * Math.pow(values.a + values.b, 7));
			expect(actual).toBeCloseTo(expected, 12);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/651
	it('does not apply branch-unsafe radical identities without assumptions', () => {
		const difference = Expression.create('sqrt(2*a)/a-sqrt(2/a)').simplify();
		expect(difference.text()).not.toEqual('0');

		// The counterexample a=-1 demonstrates why the identity cannot be unconditional.
		const counterexample = Expression.create(
			'sqrt(2*a)/a-sqrt(2/a)',
			{ a: -1 }
		).evaluate();
		expect(counterexample.isNearlyZero()).toBe(false);
	});

	it('keeps noninteger powers attached when product branches are unknown', () => {
		const productCounterexample = Expression.create(
			'(a*b)^(1/2)-a^(1/2)*b^(1/2)',
			{ a: -1, b: -1 }
		).evaluate();
		expect(productCounterexample.isNearlyZero()).toBe(false);

		const quotientCounterexample = Expression.create(
			'(a/b)^(1/2)-a^(1/2)*b^(-1/2)',
			{ a: 1, b: -1 }
		).evaluate();
		expect(quotientCounterexample.isNearlyZero()).toBe(false);
	});

	it('propagates assumed signs through powers and products', () => {
		assume('x>0');
		assume('y<0');

		try {
			expect(Expression.create('x^-1').gt(0)).toBe(true);
			expect(Expression.create('x^-2').gt(0)).toBe(true);
			expect(Expression.create('y^-1').lt(0)).toBe(true);
			expect(Expression.create('y^-2').gt(0)).toBe(true);
			expect(Expression.create('x*y^-1').lt(0)).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('combines symbolic radicals only when their radicands are provably positive', () => {
		const input = 'k^(1/2)*(m^-1)^(1/2)';
		const unknown = Expression.create(input).simplify();
		expect(unknown.isProduct()).toBe(true);

		assume('k>0');
		assume('m>0');

		try {
			const combined = Expression.create(input).simplify();
			expect(combined.getPower().eq('1/2')).toBe(true);
			expect(combined.toLinearAndUnitMultiplier().eq('k*m^-1')).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('simplifies absolute values and even roots from non-strict sign assumptions', () => {
		assume('x>=0');
		try {
			expect(nerdamer('abs(x)').eq(Expression.create('x'))).toBe(true);
			expect(nerdamer('sqrt(x^2)').eq(Expression.create('x'))).toBe(true);
			expect(nerdamer('sign(x)').text()).toEqual('sign(x)');
		} finally {
			clearAssumptions();
		}

		assume('x<=0');
		try {
			expect(nerdamer('abs(x)').eq(Expression.create('-x'))).toBe(true);
			expect(nerdamer('sqrt(x^2)').eq(Expression.create('-x'))).toBe(true);
			expect(nerdamer('sign(x)').text()).toEqual('sign(x)');
		} finally {
			clearAssumptions();
		}
	});

	it('simplifies sign functions and reciprocal roots from strict sign assumptions', () => {
		assume('x>0');
		try {
			expect(nerdamer('sign(x)').eq(Expression.create(1))).toBe(true);
			expect(nerdamer('sign(x^-1)').eq(Expression.create(1))).toBe(true);
			expect(nerdamer('sqrt(x^-2)').eq(Expression.create('x^-1'))).toBe(true);
			expect(nerdamer('sqrt(x^2)/x').eq(Expression.create(1))).toBe(true);
		} finally {
			clearAssumptions();
		}

		assume('x<0');
		try {
			expect(nerdamer('sign(x)').eq(Expression.create(-1))).toBe(true);
			expect(nerdamer('sign(x^-1)').eq(Expression.create(-1))).toBe(true);
			expect(nerdamer('sqrt(x^-2)').eq(Expression.create('-x^-1'))).toBe(true);
			expect(nerdamer('sqrt(x^2)/x').eq(Expression.create(-1))).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('uses assumed composite signs in abs and sign', () => {
		assume('x>0');
		assume('y<0');

		try {
			expect(nerdamer('abs(x*y)').eq(Expression.create('-x*y'))).toBe(true);
			expect(nerdamer('sign(x*y)').eq(Expression.create(-1))).toBe(true);
			expect(nerdamer('abs(x*y^-1)').eq(Expression.create('-x*y^-1'))).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('combines nonnegative radicals without treating a possible zero as invertible', () => {
		assume('x>=0');
		assume('y>=0');

		try {
			const combined = Expression.create('x^(1/2)*y^(1/2)').simplify();
			expect(combined.getPower().eq('1/2')).toBe(true);
			expect(combined.toLinearAndUnitMultiplier().eq('x*y')).toBe(true);
		} finally {
			clearAssumptions();
		}

		assume('k>=0');
		assume('m>=0');

		try {
			const reciprocal = Expression.create('k^(1/2)*(m^-1)^(1/2)').simplify();
			expect(reciprocal.isProduct()).toBe(true);
		} finally {
			clearAssumptions();
		}
	});

	it('retains branch-safe integer powers and conjugation rules', () => {
		expect(Expression.create('(a*b)^2-a^2*b^2').simplify().text()).toEqual('0');
		expect(
			Expression.create('((1+i)^(1/2))^2-(1+i)').evaluate().isNearlyZero()
		).toBe(true);

		expect(nerdamer('conjugate((-x)^(1/2))').text()).toEqual(
			'conjugate((-x)^(1/2))'
		);
		expect(nerdamer('conjugate((1+i)^(1/2))').text()).toEqual(
			'(1-i)^(1/2)'
		);
		expect(nerdamer('conjugate(i^(1/2))').text()).toEqual('(-i)^(1/2)');
	});

	it('keeps principal logarithm identities conservative when signs are unknown', () => {
		const product = Expression.create('log(a*b)');
		const quotient = Expression.create('log(a*b^-1)');
		const powered = Expression.create('log(a^2)');
		const scaled = Expression.create('log(2*x)');
		const signed = Expression.create('log(-x)');
		const complexExponent = Expression.create('log(e^(i*x))');

		expect(product.isFunction('log')).toBe(true);
		expect(product.getArguments()[0].text()).toEqual('a*b');
		expect(quotient.isFunction('log')).toBe(true);
		expect(quotient.getArguments()[0].text()).toEqual('a*b^-1');
		expect(powered.isFunction('log')).toBe(true);
		expect(powered.getArguments()[0].text()).toEqual('a^2');
		expect(scaled.isFunction('log')).toBe(true);
		expect(scaled.getArguments()[0].text()).toEqual('2*x');
		expect(signed.isFunction('log')).toBe(true);
		expect(signed.getArguments()[0].text()).toEqual('-x');
		expect(complexExponent.isFunction('log')).toBe(true);
		expect(complexExponent.getArguments()[0].text()).toEqual('e^(i*x)');
		expect(Expression.create('log(e^x)').text()).toEqual('x');

		const sum = Expression.create('log(a)+log(b)');
		expect(sum.simplify().text()).toEqual(sum.text());
	});

	it('uses real-domain logarithm identities when positivity is assumed', () => {
		assume('x>0');
		assume('y>0');

		try {
			expect(nerdamer('log(x*y)').text()).toEqual('log(x)+log(y)');
			expect(nerdamer('log(x^2)').text()).toEqual('2*log(x)');
			expect(Expression.create('log(x)+log(y)').simplify().text()).toEqual(
				'log(x*y)'
			);
		} finally {
			clearAssumptions();
		}
	});

	it('extracts only branch-safe scalar magnitude under symbolic powers', () => {
		const negativeScale = Expression.create('(-2*x)^y');
		const complexNegativeScale = Expression.create('(-2*(1+i))^y');
		const positiveScale = Expression.create('(2*x)^y');
		const nestedPower = Expression.create('(x^2)^y');
		const flattenedPower = Expression.create('x^(2*y)');

		// Positive real magnitude can be extracted without changing the principal
		// argument. The negative sign must stay with the symbolic part instead of
		// becoming a separate (-1)^y factor.
		expect(negativeScale.text()).toEqual('2^y*(-x)^y');
		expect(complexNegativeScale.eq('2^y*(-1-i)^y')).toBe(true);

		// At x=-1 and y=1/2, the branch-safe form still has principal value sqrt(2).
		const negativeCounterexample = negativeScale
			.evaluate({ x: '-1', y: '1/2' })
			.minus(Expression.create('2^(1/2)').evaluate());
		expect(negativeCounterexample.isNearlyZero()).toBe(true);

		// Positive real scaling is safe to split. An even power of a real symbol is
		// nonnegative, so retain the simpler branch-safe form through abs().
		expect(positiveScale.text()).toEqual('2^y*x^y');
		expect(nestedPower.text()).toEqual('abs(x)^(2*y)');
		const nestedCounterexample = nestedPower
			.evaluate({ x: '-1', y: '1/2' })
			.minus(flattenedPower.evaluate({ x: '-1', y: '1/2' }));
		expect(nestedCounterexample.isNearlyZero()).toBe(false);
	});

	it('preserves principal branches while simplifying nested and numeric powers', () => {
		expect(Expression.create('(-8)^(2/3)').text()).toEqual('4*(-1)^(2/3)');
		expect(Expression.create('(-x)^(2/3)').text()).toEqual('(-x)^(2/3)');
		expect(Expression.create('(x^-1)^(1/2)').text()).toEqual('(x^-1)^(1/2)');
		expect(Expression.create('((x+i)^2)^(1/2)').text()).toEqual(
			'((x+i)^2)^(1/2)'
		);

		// Known positive scaling is safe and should still simplify.
		expect(Expression.create('(2*x)^(1/2)').text()).toEqual(
			'2^(1/2)*x^(1/2)'
		);
		expect(Expression.create('sqrt(2/x)').text()).toEqual(
			'2^(1/2)*(x^-1)^(1/2)'
		);

		// Cancellation through a nested power is safe for a positive base with a
		// real exponent, but not for an unknown-sign base.
		expect(Expression.create('(3^x)^(1/x)').text()).toEqual('3');
		const symbolicCancellation = Expression.create('(x^x)^(1/x)');
		expect(symbolicCancellation.text()).not.toEqual('x');
		const cancellationCounterexample = symbolicCancellation
			.evaluate({ x: '-2' })
			.minus(2);
		expect(cancellationCounterexample.isNearlyZero()).toBe(true);
	});
});
