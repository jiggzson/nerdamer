import Decimal from 'decimal.js';

import { Parser } from '../../src/core/classes/parser/Parser';
import { Rational } from '../../src/core/classes/rational/Rational';
import { message } from '../../src/core/errors';
import { piPower } from '../../src/core/functions/decimal';
import nerdamer from '../../src/index';

/** Relative error of a computed value against a reference string. */
function relativeError(actual: string, expected: string): Decimal {
	const exact = new Decimal(expected);
	return new Decimal(actual).minus(exact).abs().div(exact.abs());
}

describe('Evaluated powers of e and pi', () => {
	// Reference values from mpmath at 60 digits.
	const cases: [string, string][] = [
		['e^2', '7.38905609893065022723042746058'],
		['e^100', '2.68811714181613544841262555158e+43'],
		['e^1000', '1.97007111401704699388887935224e+434'],
		['e^(-1000)', '5.07595889754945676529180947957e-435'],
		['e^(1000.5)', '3.24809815047180275963096753169e+434'],
		['exp(1000)', '1.97007111401704699388887935224e+434'],
		['pi^2', '9.86960440108935861883449099988'],
		['pi^100', '5.18784831431961319208626152463e+49'],
		['pi^1000', '1.41212354451576481231043973288e+497'],
		['pi^(-1000)', '7.08153336783937530020121838928e-498'],
		['pi^(1000.5)', '2.50292381443131422935828861488e+497'],
	];

	it('keep the full working precision for large exponents', () => {
		for (const [source, expected] of cases) {
			const value = nerdamer(source).evaluate().text({ decimal: true });
			expect(relativeError(value, expected).lt('1e-19')).toBe(true);
		}
	});

	it('computes pi^x in Decimal mode', () => {
		expect(
			relativeError(piPower('1000').toString(), '1.41212354451576481231043973288e+497').lt(
				'1e-19'
			)
		).toBe(true);
		expect(
			relativeError(piPower('-1000').toString(), '7.08153336783937530020121838928e-498').lt(
				'1e-19'
			)
		).toBe(true);
		expect(piPower('0').eq(1)).toBe(true);
	});

	it('still throws when the result exceeds MAX_NUMBER_DIGITS', () => {
		const outOfRange = message('resultOutOfRange');
		for (const source of ['e^(2.4e5)', 'e^(-2.4e5)', 'pi^(1e6)']) {
			expect(() => nerdamer(source).evaluate()).toThrow(outOfRange);
		}
	});
});

describe('Evaluated complex powers', () => {
	it('keep the full working precision in both components', () => {
		// Reference values from mpmath at 60 digits.
		const cases: [string, string, string][] = [
			[
				'(-2)^(1+i)',
				'-0.0664836540177133105180358353253',
				'-0.055224040736666019901649309081',
			],
			[
				'(2+3i)^(100i+7)',
				'-1.64547025049207071673603041348e-39',
				'-6.34475624978265625850197036773e-41',
			],
			['2^(3+40i)', '-6.82668323397431928986319005402', '4.17089870687049044651360750316'],
		];
		for (const [source, re, im] of cases) {
			const value = nerdamer(source).evaluate();
			const real = nerdamer('realpart(z)', { z: value }).evaluate().text({ decimal: true });
			const imaginary = nerdamer('imagpart(z)', { z: value })
				.evaluate()
				.text({ decimal: true });
			expect(relativeError(real, re).lt('1e-19')).toBe(true);
			expect(relativeError(imaginary, im).lt('1e-19')).toBe(true);
		}
	});

	it('returns exact components when the guard digits resolve them', () => {
		expect(nerdamer('(3-4i)^(2.5)').evaluate().text()).toEqual('-38.0-41.0*i');
	});

	it('restores the working precision afterwards', () => {
		nerdamer('(2+3i)^(5i+3)').evaluate();
		expect(nerdamer('pi').evaluate().text()).toEqual('3.1415926535897932385');
	});
});

describe('Rational eqE and eqPi', () => {
	it('compare with the constants at the working precision', () => {
		expect(Rational.E.copy().eqE()).toBe(true);
		expect(Rational.PI.copy().eqPi()).toBe(true);
		expect(Rational.E.eqPi()).toBe(false);
		expect(Rational.create('2.718281828').eqE()).toBe(false);
		expect(Rational.create('1').eqE()).toBe(false);
	});

	it('follow a change of precision', () => {
		const previous = Rational.E.copy();
		Parser.setPrecision(30);
		try {
			expect(Rational.E.copy().eqE()).toBe(true);
			expect(previous.eqE()).toBe(false);
		} finally {
			Parser.setPrecision(20);
		}
	});
});
