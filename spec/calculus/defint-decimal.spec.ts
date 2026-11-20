import Decimal from 'decimal.js';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Rational } from '../../src/core/classes/rational/Rational';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import nerdamer from '../../src/index';
import * as nativeModule from '../../src/math/defint/defintNative';

/** The relative error of a defint result against a reference value. */
function relativeError(source: string, expected: string): Decimal {
	const actual = new Decimal((nerdamer(source) as Expression).text({ decimal: true }));
	const exact = new Decimal(expected);
	return exact.isZero() ? actual.abs() : actual.minus(exact).abs().div(exact.abs());
}

describe('Decimal definite integration', () => {
	afterEach(() => clearWarnings());

	// Reference values from mpmath at 60 digits.
	it.each([
		['defint(cos(x)-x^2+6,x,1,6)', '-42.7875531496734890461307244349088604259172246'],
		['defint(e^(-x^2),x,0,1)', '0.746824132812427025399467436131853005354499687'],
		['defint(x^x^2,x,0,5)', '14333753291845831.2049850248095253349842944323'],
		['defint(sqrt(4*x^2+4),x,0,3)', '11.3052794397372048194803795968588645949449194'],
		['defint(sin(10*x)^2,x,0,3)', '1.50762026552755541764064123663696064602073115'],
		// Bounds that binary floating point can't represent.
		['defint(x^2,x,0,0.1)', '0.000333333333333333333333333333333333333333333333'],
		// Endpoint singularities.
		['defint(log10(x),x,0,1)', '-0.434294481903251827651128918916605082294397006'],
		['defint(log(x),x,0,1)', '-1'],
		['defint(1/sqrt(x),x,0,1)', '2'],
		['defint(log(2*cos(x/2)),x,-pi,pi)', '0'],
		// A kink and jumps inside the interval.
		['defint(abs(x-1/3),x,0,1)', '0.277777777777777777777777777777777777777777778'],
		['defint(sign(x),x,-1,2)', '1'],
		['defint(floor(x),x,0,3.5)', '4.5'],
	])('evaluates %s to the configured precision', (source, expected) => {
		expect(relativeError(source, expected).lte('1e-19')).toBe(true);
	});

	it('follows a change of precision', () => {
		const precision = Rational.getPrecision();
		Rational.set({ precision: 40 });
		try {
			const error = relativeError(
				'defint(e^(-x^2),x,0,1)',
				'0.746824132812427025399467436131853005354499687'
			);
			expect(error.lte('1e-39')).toBe(true);
		} finally {
			Rational.set({ precision });
		}
	});

	it('does not use native arithmetic unless asked to', () => {
		const native = jest.spyOn(nativeModule, 'definiteIntegrateNative');
		try {
			nerdamer('defint(sin(x),x,0,pi)');
			expect(native).not.toHaveBeenCalled();

			nerdamer.set('USE_NATIVE_DEFINT', true);
			const result = nerdamer('defint(sin(x),x,0,pi)') as Expression;
			expect(native).toHaveBeenCalled();
			expect(Number(result.text({ decimal: true }))).toBeCloseTo(2, 12);
		} finally {
			nerdamer.set('USE_NATIVE_DEFINT', false);
			native.mockRestore();
		}
	});

	it.each([['defint(1/x,x,0,1)'], ['defint(tan(x),x,0,2)']])(
		'leaves the divergent %s unevaluated with a warning',
		source => {
			const result = nerdamer(source) as Expression;
			expect(result.isFunction('defint')).toBe(true);
			expect(getWarnings().map(warning => warning.code)).toEqual(['defint.singularity']);
		}
	);
});
