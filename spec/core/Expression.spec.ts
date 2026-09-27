import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import {
	eight,
	four,
	half,
	minusThree,
	sixteen,
	three,
	twentySeven,
	twoHundredFiftySix,
} from '../../src/core/classes/expression/shortcuts';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Rational } from '../../src/core/classes/rational/Rational';

describe('Expression construction', () => {
	it('preserves identity for ordinary Expression.create coercion', () => {
		const expression = Expression.create('x+1');

		expect(Expression.create(expression)).toBe(expression);
	});

	it('creates an independent clone when Expression.create is asked to copy', () => {
		const expression = Expression.create('x+1');
		const copy = Expression.create(expression, undefined, true);

		copy.multiplier = Rational.create('3');

		expect(copy).not.toBe(expression);
		expect(copy.text()).toEqual('3*(1+x)');
		expect(expression.text()).toEqual('1+x');
	});

	it('uses direct construction for explicit clone semantics', () => {
		const expression = Expression.create('x+1');
		const copy = new Expression(expression);

		copy.multiplier = Rational.create('3');

		expect(copy).not.toBe(expression);
		expect(copy.text()).toEqual('3*(1+x)');
		expect(expression.text()).toEqual('1+x');
	});


	it('deep-copies aggregate children', () => {
		const expression = Expression.create('x+y');
		const copy = expression.copy();
		const copiedX = Object.values(copy.getElements()).find(element => element.value === 'x');

		expect(copiedX).toBeDefined();
		copiedX!.multiplier = Rational.create('3');

		expect(copy.text()).toEqual('3*x+y');
		expect(expression.text()).toEqual('x+y');
		expect(copiedX).not.toBe(
			Object.values(expression.getElements()).find(element => element.value === 'x')
		);
	});

	it('deep-copies powers, function arguments, and exponential bases', () => {
		const powered = Expression.create('x^(y+1)');
		const poweredCopy = powered.copy();
		const fn = Expression.create('sin(x+y)');
		const fnCopy = fn.copy();
		const exponential = Expression.create('2^(x+y)');
		const exponentialCopy = exponential.copy();

		expect(poweredCopy.power).not.toBe(powered.power);
		expect(fnCopy.args?.[0]).not.toBe(fn.args?.[0]);
		expect(exponentialCopy.base).not.toBe(exponential.base);

		poweredCopy.power!.multiplier = Rational.create('2');
		fnCopy.args![0].multiplier = Rational.create('3');
		exponentialCopy.base!.multiplier = Rational.create('5');

		expect(powered.text()).toEqual('x^(1+y)');
		expect(fn.text()).toEqual('sin(x+y)');
		expect(exponential.text()).toEqual('2^(x+y)');
	});

	it('continues to apply the Expression hook when copying', () => {
		const expression = Expression.create('x');
		const replacement = Expression.create('y');
		const originalHook = Expression.hook;

		try {
			Expression.hook = value => value === expression ? replacement : value;
			expect(expression.copy().text()).toEqual('y');
		} finally {
			Expression.hook = originalHook;
		}
	});
});

describe('preconstructed numeric shortcuts', () => {
	it('reuses frozen expressions for common solver constants', () => {
		const values = [
			[eight, '8'],
			[sixteen, '16'],
			[twentySeven, '27'],
			[twoHundredFiftySix, '256'],
		] as const;

		for (const [getValue, text] of values) {
			const value = getValue();
			expect(value.text()).toEqual(text);
			expect(getValue()).toBe(value);
			expect(Object.isFrozen(value)).toBe(true);
		}
	});
});

describe('aggregate key caching', () => {
	it('reuses the ordinary SUM/PRD key until the aggregate is rebuilt', () => {
		const expression = Expression.create('x+y+1');
		const originalGetValue = Expression.getValue;
		let getValueCalls = 0;

		try {
			Expression.getValue = function (
				...args: Parameters<typeof originalGetValue>
			): string {
				getValueCalls++;
				return originalGetValue.apply(Expression, args);
			};

			const first = expression.keyValue();
			const afterFirst = getValueCalls;
			const second = expression.keyValue();

			expect(second).toBe(first);
			expect(getValueCalls).toBe(afterFirst);

			const term = Object.values(expression.getElements()).find(element => element.value === 'x');
			expect(term).toBeDefined();
			term!.multiplier = Rational.create('3');
			expression.updateValue();
			const afterUpdate = getValueCalls;

			const rebuilt = expression.keyValue();
			expect(rebuilt).not.toBe(first);
			expect(afterUpdate).toBeGreaterThan(afterFirst);
			expect(getValueCalls).toBeGreaterThan(afterUpdate);
		} finally {
			Expression.getValue = originalGetValue;
		}
	});

	it('reuses the aggregate key generated during arithmetic rebuild', () => {
		const expression = Expression.create('x').plus(Expression.create('y'));
		const originalGetValue = Expression.getValue;
		let getValueCalls = 0;

		try {
			Expression.getValue = function (
				...args: Parameters<typeof originalGetValue>
			): string {
				getValueCalls++;
				return originalGetValue.apply(Expression, args);
			};

			expect(expression.keyValue()).toBe('x+y');
			expect(getValueCalls).toBe(0);
		} finally {
			Expression.getValue = originalGetValue;
		}
	});

	it('does not transfer an aggregate key cache to an independent copy', () => {
		const expression = Expression.create('x+y');
		expression.keyValue();
		const copy = expression.copy();

		const copiedY = Object.values(copy.getElements()).find(element => element.value === 'y');
		expect(copiedY).toBeDefined();
		copiedY!.multiplier = Rational.create('2');
		copy.updateValue();

		expect(copy.keyValue()).not.toBe(expression.keyValue());
	});
});

describe('aggregate value maintenance', () => {
	it('refreshes the stored sum value after distributing a multiplier', () => {
		const expression = Expression.create('2*(x+1)');
		const distributed = expression.distributeMultiplier();

		expect(distributed.text()).toEqual('2+2*x');
		expect(distributed.value).toEqual(
			Expression.getValue(Object.values(distributed.getElements()), 'text', distributed.type)
		);
	});
});

describe('getBase', () => {
	it('removes the outer coefficient and power from non-EXP expressions', () => {
		expect(Expression.create('3*x^2').getBase().text()).toEqual('x');
		expect(Expression.create('3*sin(x)^2').getBase().text()).toEqual('sin(x)');
	});

	it('preserves the complete mathematical base of EXP expressions', () => {
		expect(Expression.create('2^(x+1)').getBase().text()).toEqual('2');
		expect(Expression.create('(-i)^(1/2)').getBase().text()).toEqual('-i');
	});

	it('does not reinterpret an existing base through later parser values', () => {
		const variable = 'native_roundtrip_probe';
		const expression = Expression.create(`3*${variable}^2`);
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);
			expect(expression.getBase().text()).toEqual(variable);
		} finally {
			if (previous) {
				Parser.KNOWN_VALUES[variable] = previous;
			} else {
				delete Parser.KNOWN_VALUES[variable];
			}
		}
	});

	it('preserves an EXP base natively when removing its outer power', () => {
		const variable = 'native_exp_roundtrip_probe';
		const expression = Expression.create(`${variable}^x`);
		const previous = Parser.KNOWN_VALUES[variable];

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(11);
			const base = expression.toLinearAndUnitMultiplier();

			expect(base.text()).toEqual(variable);
			expect(base).not.toBe(expression.getBase());
		} finally {
			if (previous) {
				Parser.KNOWN_VALUES[variable] = previous;
			} else {
				delete Parser.KNOWN_VALUES[variable];
			}
		}
	});

	it('keeps getBase canonical while copy-oriented helpers stay independent', () => {
		const expression = Expression.create('x^y');
		const base = expression.getBase();
		const linearized = expression.toLinearAndUnitMultiplier();
		const parsedValue = expression.parseValue();

		expect(expression.getBase()).toBe(base);
		expect(linearized).not.toBe(base);
		expect(parsedValue).not.toBe(base);
		expect(linearized.text()).toEqual(base.text());
		expect(parsedValue.text()).toEqual(base.text());
	});
});

describe('getNumerator', () => {
	it('should get the numerator correctly', () => {
		expect(Expression.create('a*(x+1)/(x^2+2*x+1)').getNumerator().text()).toEqual('a*(1+x)');
		expect(Expression.create('a/x+8').getNumerator().text()).toEqual('8+a*x^-1');
		expect(Expression.create('(a*(x*(x+2)^-2))').getNumerator().text()).toEqual('a*x');
		expect(Expression.create('a/((x+1)*(a+b))').getNumerator().text()).toEqual('a');
		expect(Expression.create('(1/2)*(x+1)').getNumerator().text()).toEqual('1+x');
		expect(Expression.create('2/x').getNumerator().text()).toEqual('2');
		expect(Expression.create('2/x^x').getNumerator().text()).toEqual('2');
		expect(Expression.create('(a*b)^(1/2)').getNumerator().text()).toEqual('(a*b)^(1/2)');
	});
});
describe('getDenominator', () => {
	it('should get the numerator correctly', () => {
		expect(Expression.create('a*(x+1)/(x^2+2*x+1)').getDenominator().text()).toEqual(
			'1+2*x+x^2'
		);
		expect(Expression.create('a/x+8').getDenominator().text()).toEqual('1');
		expect(Expression.create('(a*(x*(x+2)^-2))').getDenominator().text()).toEqual('(2+x)^2');
		expect(Expression.create('a/((x+1)*(a+b))').getDenominator().text()).toEqual('(1+x)*(a+b)');
		expect(Expression.create('(1/2)*(x+1)').getDenominator().text()).toEqual('2');
		expect(Expression.create('2/x').getDenominator().text()).toEqual('x');
		expect(Expression.create('2/x^x').getDenominator().text()).toEqual('x^x');
		expect(Expression.create('5/(8*x^cos(x))').getDenominator().text()).toEqual('8*x^cos(x)');
		expect(Expression.create('(a*b)^(1/2)').getDenominator().text()).toEqual('1');
	});
});

describe('parity predicates', () => {
	it('should identify odd integers without classifying unknown symbolic values as odd', () => {
		expect(three().isOdd()).toBe(true);
		expect(minusThree().isOdd()).toBe(true);
		expect(four().isOdd()).toBe(false);
		expect(half().isOdd()).toBe(false);
		expect(Expression.create('x').isOdd()).toBe(false);
		expect(Expression.create('pi').isOdd()).toBe(false);
	});
});
