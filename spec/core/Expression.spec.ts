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
