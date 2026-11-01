import Decimal from 'decimal.js';

import { Complex } from '../../src/core/classes/complex/Complex';
import { Parser } from '../../src/core/classes/parser/Parser';
import { gammaComplex } from '../../src/core/functions/decimal';
import '../../src/index';

describe('legacy #181 complex gamma identities', () => {
	// NIST DLMF §5.5: Γ(z+1)=zΓ(z), Γ(z)Γ(1-z)sin(πz)=π,
	// and Γ(conj(z))=conj(Γ(z)). https://dlmf.nist.gov/5.5
	const cases = [
		['first quadrant', '1', '1'],
		['second quadrant', '-1', '1'],
		['third quadrant', '-2', '-1'],
		['fourth quadrant', '2', '-1'],
		['left of reflection threshold', '0.49', '0.75'],
		['right of reflection threshold', '0.51', '0.75'],
		['near pole at -1', '-1', '0.0001'],
		['near pole at -2', '-2', '-0.0001'],
	] as const;

	for (const precision of [20, 50] as const) {
		it.each(cases)(`preserves gamma identities at ${precision} digits: %s`, (_name, real, imaginary) => {
			const oldPrecision = Parser.getPrecision();
			try {
				Parser.setPrecision(precision);
				const z = new Complex(new Decimal(real), new Decimal(imaginary));
				const one = new Complex(1);
				const pi = Decimal.acos(-1);
				const gammaZ = gammaComplex(z);
				const gammaNext = gammaComplex(z.add(one));
				const gammaConjugate = gammaComplex(z.conjugate());
				const gammaReflected = gammaComplex(one.sub(z));
				const piZ = z.scale(pi);
				const sinPiZ = new Complex(
					piZ.re.sin().mul(piZ.im.cosh()),
					piZ.re.cos().mul(piZ.im.sinh())
				);

				// Relative errors retain meaning when gamma becomes large near a pole.
				const comparisons = [
					[gammaNext, z.times(gammaZ)],
					[gammaConjugate, gammaZ.conjugate()],
					[gammaZ.times(gammaReflected).times(sinPiZ), new Complex(pi)],
				] as const;
				const tolerance = new Decimal(10).pow(-(precision - 5));
				for (const [actual, expected] of comparisons) {
					const scale = Decimal.max(1, actual.abs(), expected.abs());
					const error = actual.sub(expected).abs().div(scale);
					expect(error.lte(tolerance)).toBe(true);
				}
				expect(Decimal.precision).toBe(precision);
			} finally {
				Parser.setPrecision(oldPrecision);
			}
		});
	}
});
