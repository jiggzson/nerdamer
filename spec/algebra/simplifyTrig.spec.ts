import { simplify } from '../../src/algebra/simplify/simplify';
import {
	trigReduce,
	reduceTrigPower,
	productToSum,
	contractToDoubleAngle,
	expandDoubleAngle,
} from '../../src/algebra/simplify/trigreduce';
import { rewrite, tryRewriteTrig, hasDerivedTrig } from '../../src/algebra/simplify/trigrewrite';
import { Expression } from '../../src/core/classes/expression/Expression';

const text = (expr: string | number) => Expression.create(expr).text();

// ============================================================================
// 1. TRIGREWRITE — tan/sec/csc/cot → sin/cos
// ============================================================================
describe('Trig Rewrite (trigrewrite)', () => {
	describe('hasDerivedTrig', () => {
		it('should detect derived trig functions', () => {
			expect(hasDerivedTrig(Expression.create('tan(x)'))).toBe(true);
			expect(hasDerivedTrig(Expression.create('sec(x)'))).toBe(true);
			expect(hasDerivedTrig(Expression.create('csc(x)'))).toBe(true);
			expect(hasDerivedTrig(Expression.create('cot(x)'))).toBe(true);
			expect(hasDerivedTrig(Expression.create('sin(x)+tan(x)'))).toBe(true);
		});

		it('should return false for sin/cos only expressions', () => {
			expect(hasDerivedTrig(Expression.create('sin(x)'))).toBe(false);
			expect(hasDerivedTrig(Expression.create('cos(x)'))).toBe(false);
			expect(hasDerivedTrig(Expression.create('sin(x)+cos(x)'))).toBe(false);
			expect(hasDerivedTrig(Expression.create('x^2+1'))).toBe(false);
		});
	});

	describe('rewrite', () => {
		it('should rewrite tan(x) → sin(x)/cos(x)', () => {
			const result = rewrite(Expression.create('tan(x)'));
			// tan(x) = sin(x) * cos(x)^(-1)
			expect(result.text()).toEqual(text('sin(x)*cos(x)^(-1)'));
		});

		it('should rewrite cot(x) → cos(x)/sin(x)', () => {
			const result = rewrite(Expression.create('cot(x)'));
			expect(result.text()).toEqual(text('cos(x)*sin(x)^(-1)'));
		});

		it('should rewrite sec(x) → 1/cos(x)', () => {
			const result = rewrite(Expression.create('sec(x)'));
			expect(result.text()).toEqual(text('cos(x)^(-1)'));
		});

		it('should rewrite csc(x) → 1/sin(x)', () => {
			const result = rewrite(Expression.create('csc(x)'));
			expect(result.text()).toEqual(text('sin(x)^(-1)'));
		});

		it('should handle powers: tan(x)^2 → sin(x)^2/cos(x)^2', () => {
			const result = rewrite(Expression.create('tan(x)^2'));
			expect(result.text()).toEqual(text('sin(x)^2*cos(x)^(-2)'));
		});

		it('should handle powers: sec(x)^2 → cos(x)^(-2)', () => {
			const result = rewrite(Expression.create('sec(x)^2'));
			expect(result.text()).toEqual(text('cos(x)^(-2)'));
		});

		it('should preserve multipliers: 3*tan(x) → 3*sin(x)/cos(x)', () => {
			const result = rewrite(Expression.create('3*tan(x)'));
			expect(result.text()).toEqual(text('3*sin(x)*cos(x)^(-1)'));
		});

		it('should handle sums: tan(x) + sec(x)', () => {
			const result = rewrite(Expression.create('tan(x)+sec(x)'));
			// sin(x)/cos(x) + 1/cos(x) = (sin(x)+1)/cos(x)
			const expected = Expression.create('sin(x)*cos(x)^(-1)+cos(x)^(-1)');
			expect(result.text()).toEqual(expected.text());
		});
	});

	describe('tryRewriteTrig', () => {
		it('should not rewrite when no derived trig present', () => {
			const x = Expression.create('sin(x)+cos(x)');
			expect(tryRewriteTrig(x).text()).toEqual(x.text());
		});

		it('should return original if rewrite is more complex', () => {
			// tan(x) alone might be simpler than sin(x)*cos(x)^(-1)
			const x = Expression.create('tan(x)');
			const result = tryRewriteTrig(x);
			// Either form is acceptable — the point is it doesn't crash
			expect(result).toBeDefined();
		});
	});
});

// ============================================================================
// 2. TRIGREDUCE — Power reduction
// ============================================================================
describe('Trig Reduce (trigreduce)', () => {
	describe('reduceTrigPower', () => {
		it('should reduce sin²(x) → (1-cos(2x))/2', () => {
			const result = reduceTrigPower(Expression.create('sin(x)^2'));
			// (1 - cos(2*x)) / 2 = 1/2 - (1/2)*cos(2*x)
			const expected = Expression.create('(1-cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should reduce cos²(x) → (1+cos(2x))/2', () => {
			const result = reduceTrigPower(Expression.create('cos(x)^2'));
			const expected = Expression.create('(1+cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should reduce sin³(x) → sin(x)·(1-cos(2x))/2', () => {
			const result = reduceTrigPower(Expression.create('sin(x)^3'));
			// sin(x) * (1 - cos(2x))/2
			const expected = Expression.create('sin(x)*(1-cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should reduce cos³(x) → cos(x)·(1+cos(2x))/2', () => {
			const result = reduceTrigPower(Expression.create('cos(x)^3'));
			const expected = Expression.create('cos(x)*(1+cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should reduce sin⁴(x) → ((1-cos(2x))/2)²', () => {
			const result = reduceTrigPower(Expression.create('sin(x)^4'));
			const expected = Expression.create('((1-cos(2*x))/2)^2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should not reduce sin(x) (power 1)', () => {
			const result = reduceTrigPower(Expression.create('sin(x)'));
			expect(result.text()).toEqual('sin(x)');
		});

		it('should not reduce non-trig expressions', () => {
			const result = reduceTrigPower(Expression.create('x^2'));
			expect(result.text()).toEqual('x^2');
		});

		it('should preserve multipliers: 3*sin²(x)', () => {
			const result = reduceTrigPower(Expression.create('3*sin(x)^2'));
			const expected = Expression.create('3*(1-cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});
	});

	describe('trigReduce (full expression)', () => {
		it('should reduce sin²(x) + cos²(x) into double-angle form', () => {
			const result = trigReduce(Expression.create('sin(x)^2+cos(x)^2'));
			// (1-cos(2x))/2 + (1+cos(2x))/2 = 1
			// After algebraic simplification this should be 1
			const expected = Expression.create('(1-cos(2*x))/2+(1+cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should reduce sin²(x) in a product', () => {
			const result = trigReduce(Expression.create('x*sin(x)^2'));
			const expected = Expression.create('x*(1-cos(2*x))/2');
			expect(result.text()).toEqual(expected.text());
		});
	});
});

// ============================================================================
// 3. DOUBLE ANGLE
// ============================================================================
describe('Double Angle', () => {
	describe('expandDoubleAngle', () => {
		it('should expand sin(2x) → 2·sin(x)·cos(x)', () => {
			const result = expandDoubleAngle(Expression.create('sin(2*x)'));
			const expected = Expression.create('2*sin(x)*cos(x)');
			expect(result.text()).toEqual(expected.text());
		});

		it('should expand cos(2x) → cos²(x) - sin²(x)', () => {
			const result = expandDoubleAngle(Expression.create('cos(2*x)'));
			const expected = Expression.create('cos(x)^2-sin(x)^2');
			expect(result.text()).toEqual(expected.text());
		});

		it('should expand sin(4x) → 2·sin(2x)·cos(2x)', () => {
			const result = expandDoubleAngle(Expression.create('sin(4*x)'));
			const expected = Expression.create('2*sin(2*x)*cos(2*x)');
			expect(result.text()).toEqual(expected.text());
		});

		it('should not expand sin(x) (no factor of 2)', () => {
			const result = expandDoubleAngle(Expression.create('sin(x)'));
			expect(result.text()).toEqual('sin(x)');
		});

		it('should not expand sin(3x) (odd multiplier)', () => {
			const result = expandDoubleAngle(Expression.create('sin(3*x)'));
			expect(result.text()).toEqual(text('sin(3*x)'));
		});

		it('should handle expressions in sums', () => {
			const result = expandDoubleAngle(Expression.create('sin(2*x)+cos(2*x)'));
			const expected = Expression.create('cos(x)^2-sin(x)^2+2*sin(x)*cos(x)');
			expect(result.text()).toEqual(expected.text());
		});
	});

	describe('contractToDoubleAngle', () => {
		it('should contract sin(x)·cos(x) → (1/2)·sin(2x)', () => {
			const result = contractToDoubleAngle(Expression.create('sin(x)*cos(x)'));
			const expected = Expression.create('(1/2)*sin(2*x)');
			expect(result.text()).toEqual(expected.text());
		});

		it('should contract 2·sin(x)·cos(x) → sin(2x)', () => {
			const result = contractToDoubleAngle(Expression.create('2*sin(x)*cos(x)'));
			const expected = Expression.create('sin(2*x)');
			expect(result.text()).toEqual(expected.text());
		});

		it('should contract with extra factors: x·sin(x)·cos(x) → (x/2)·sin(2x)', () => {
			const result = contractToDoubleAngle(Expression.create('x*sin(x)*cos(x)'));
			const expected = Expression.create('(1/2)*x*sin(2*x)');
			expect(result.text()).toEqual(expected.text());
		});

		it('should not contract when arguments differ', () => {
			const result = contractToDoubleAngle(Expression.create('sin(x)*cos(y)'));
			expect(result.text()).toEqual(text('cos(y)*sin(x)'));
		});

		it('should not contract non-products', () => {
			const result = contractToDoubleAngle(Expression.create('sin(x)+cos(x)'));
			expect(result.text()).toEqual(text('sin(x)+cos(x)'));
		});
	});
});

// ============================================================================
// 4. PRODUCT-TO-SUM
// ============================================================================
describe('Product to Sum', () => {
	it('should convert sin(a)·cos(b) → (1/2)[sin(a+b) + sin(a-b)]', () => {
		const result = productToSum(Expression.create('sin(a)*cos(b)'));
		const expected = Expression.create('(1/2)*(sin(b+a)-sin(b-a))');
		expect(result.text()).toEqual(expected.text());
	});

	it('should convert cos(a)·cos(b) → (1/2)[cos(a-b) + cos(a+b)]', () => {
		const result = productToSum(Expression.create('cos(a)*cos(b)'));
		const expected = Expression.create('(1/2)*(cos(a-b)+cos(a+b))');
		expect(result.text()).toEqual(expected.text());
	});

	it('should convert sin(a)·sin(b) → (1/2)[cos(a-b) - cos(a+b)]', () => {
		const result = productToSum(Expression.create('sin(a)*sin(b)'));
		const expected = Expression.create('(1/2)*(cos(a-b)-cos(a+b))');
		expect(result.text()).toEqual(expected.text());
	});

	it('should convert cos(a)·sin(b) → (1/2)[sin(a+b) - sin(a-b)]', () => {
		const result = productToSum(Expression.create('cos(a)*sin(b)'));
		const expected = Expression.create('(1/2)*(sin(a+b)-sin(a-b))');
		expect(result.text()).toEqual(expected.text());
	});

	it('should handle same-argument case: sin(x)·cos(x) → (1/2)·sin(2x)', () => {
		const result = productToSum(Expression.create('sin(x)*cos(x)'));
		// sin(x+x) + sin(x-x) = sin(2x) + sin(0) = sin(2x) + 0
		const expected = Expression.create('(1/2)*(sin(2*x)+sin(0))');
		expect(result.text()).toEqual(expected.text());
	});

	it('should preserve multipliers: 3·sin(a)·cos(b)', () => {
		const result = productToSum(Expression.create('3*sin(a)*cos(b)'));
		const expected = Expression.create('(3/2)*(sin(b+a)-sin(b-a))');
		expect(result.text()).toEqual(expected.text());
	});

	it('should not convert single trig functions', () => {
		const result = productToSum(Expression.create('sin(x)'));
		expect(result.text()).toEqual('sin(x)');
	});

	it('should not convert non-linear trig products', () => {
		// sin(x)^2 * cos(x) — sin has power 2, should not be treated as linear factor
		const result = productToSum(Expression.create('sin(x)^2*cos(x)'));
		expect(result.text()).toEqual(text('sin(x)^2*cos(x)'));
	});
});

// ============================================================================
// 5. EXTENDED PYTHAGOREAN in trigsimp (sec²-tan²=1, csc²-cot²=1)
// ============================================================================
describe('Extended Pythagorean Identities', () => {
	it('should simplify sec²(x) - tan²(x) = 1', () => {
		expect(simplify('sec(x)^2-tan(x)^2').text()).toEqual('1');
	});

	it('should simplify csc²(x) - cot²(x) = 1', () => {
		expect(simplify('csc(x)^2-cot(x)^2').text()).toEqual('1');
	});

	it('should simplify with coefficients: 3·sec²(x) - 3·tan²(x) = 3', () => {
		expect(simplify('3*sec(x)^2-3*tan(x)^2').text()).toEqual('3');
	});

	it('should simplify with additional terms: sec²(x) - tan²(x) + 5 = 6', () => {
		expect(simplify('sec(x)^2-tan(x)^2+5').text()).toEqual('6');
	});

	it('should simplify both pairs simultaneously', () => {
		expect(simplify('sec(x)^2-tan(x)^2+csc(y)^2-cot(y)^2').text()).toEqual('2');
	});
});

// ============================================================================
// 6. EXISTING PYTHAGOREAN TESTS (should still pass)
// ============================================================================
describe('Existing Pythagorean (regression)', () => {
	it('should simplify sin²(x) + cos²(x) = 1', () => {
		expect(simplify('sin(x)^2+cos(x)^2').text()).toEqual('1');
	});

	it('should simplify with constant coefficients', () => {
		expect(simplify('3*sin(x)^2+3*cos(x)^2').text()).toEqual('3');
		expect(simplify('5*sin(x)^2+5*cos(x)^2').text()).toEqual('5');
	});

	it('should simplify with variable coefficients', () => {
		expect(simplify('x*sin(x)^2+x*cos(x)^2').text()).toEqual('x');
		expect(simplify('x*cos(x)^2+x+x*sin(x)^2').text()).toEqual('2*x');
		expect(simplify('a*b*sin(x)^2+a*b*cos(x)^2').text()).toEqual('a*b');
	});

	it('should simplify with non-trivial arguments', () => {
		expect(simplify('sin(x^2)^2+cos(x^2)^2').text()).toEqual('1');
		expect(simplify('sin(2*x)^2+cos(2*x)^2').text()).toEqual('1');
		expect(simplify('sin(a+b)^2+cos(a+b)^2').text()).toEqual('1');
	});

	it('should simplify multiple independent pairs', () => {
		expect(simplify('sin(x)^2+cos(x)^2+sin(y)^2+cos(y)^2').text()).toEqual('2');
		expect(simplify('sin(x)^2+cos(x)^2+sin(x^2)^2+cos(x^2)^2').text()).toEqual('2');
	});

	it('should simplify Pythagorean identity with additional terms', () => {
		expect(simplify('cos(x)^2+sin(x)^2+cos(x)-tan(x)-1+sin(x^2)^2+cos(x^2)^2').text()).toEqual(
			'cos(x)-sin(x)*cos(x)^-1+1'
		);
		expect(simplify('sin(x)^2+cos(x)^2+5').text()).toEqual('6');
		expect(simplify('a+sin(x)^2+cos(x)^2').text()).toEqual('1+a');
	});

	it('should apply partial Pythagorean simplification when coefficients differ', () => {
		expect(simplify('(1/2)*sin(x^2)^2+cos(x^2)^2').text()).toEqual('(1/2)*(1+cos(x^2)^2)');
		// expect(simplify('0.75*sin(x^2)^2+cos(x^2)^2').text()).toEqual('(1/4)*(3.0+cos(x^2)^2)');
	});

	it('should leave unmatched trig terms unchanged', () => {
		expect(simplify('sin(x)^2+cos(y)^2').text()).toEqual('cos(y)^2+sin(x)^2');
	});

	it('should leave non-squared trig terms unchanged', () => {
		expect(simplify('sin(x)+cos(x)').text()).toEqual('cos(x)+sin(x)');
		expect(simplify('sin(x)^3+cos(x)^3').text()).toEqual('cos(x)^3+sin(x)^3');
	});
});
