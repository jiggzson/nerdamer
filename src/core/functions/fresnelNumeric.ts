/**
 * Evaluates the normalized Fresnel integrals with JavaScript-number arithmetic.
 *
 * Moderate arguments use adaptive Simpson integration over short segments. Large
 * arguments use the standard asymptotic expansions, avoiding excessive work as
 * the integrand becomes increasingly oscillatory.
 */
export function fresnelIntegral(x: number, sine: number): number {
	const ASYMPTOTIC_CUTOFF = 8;
	const ASYMPTOTIC_F_COEFFICIENTS = [1, -3, 105, -10395] as const;
	const ASYMPTOTIC_G_COEFFICIENTS = [1, -15, 945, -135135] as const;
	const HALF = 0.5;
	const INTEGRATION_TOLERANCE = 1e-13;
	const MAX_DEPTH = 20;
	const SEGMENTS_PER_UNIT = 2;
	const SIMPSON_DIVISOR = 6;
	const SIMPSON_ERROR_FACTOR = 15;
	const SIMPSON_MIDDLE_WEIGHT = 4;

	let retval: number;

	if (Number.isNaN(x)) {
		retval = NaN;
	} else if (!Number.isFinite(x)) {
		retval = Math.sign(x) * HALF;
	} else if (x === 0) {
		retval = 0;
	} else {
		const sign = x < 0 ? -1 : 1;
		x = Math.abs(x);
		const phase = Math.PI * x * x * HALF;
		const useSine = sine !== 0;

		if (x >= ASYMPTOTIC_CUTOFF) {
			const t = 1 / (Math.PI * Math.PI * x ** 4);
			const [f0, f1, f2, f3] = ASYMPTOTIC_F_COEFFICIENTS;
			const [g0, g1, g2, g3] = ASYMPTOTIC_G_COEFFICIENTS;
			const f = (f0 + f1 * t + f2 * t ** 2 + f3 * t ** 3) / (Math.PI * x);
			const g =
				(g0 + g1 * t + g2 * t ** 2 + g3 * t ** 3) / (Math.PI ** 2 * x ** 3);
			const value = useSine
				? HALF - f * Math.cos(phase) - g * Math.sin(phase)
				: HALF + f * Math.sin(phase) - g * Math.cos(phase);
			retval = sign * value;
		} else {
			const fn = useSine
				? (value: number) => Math.sin(Math.PI * value * value * HALF)
				: (value: number) => Math.cos(Math.PI * value * value * HALF);
			const segments = Math.max(1, Math.ceil(x * SEGMENTS_PER_UNIT));
			let total = 0;
			let a = 0;

			for (let segment = 0; segment < segments; segment++) {
				const b = (x * (segment + 1)) / segments;
				const midpoint = (a + b) * HALF;
				const fa = fn(a);
				const fm = fn(midpoint);
				const fb = fn(b);
				const whole =
					((b - a) / SIMPSON_DIVISOR) *
					(fa + SIMPSON_MIDDLE_WEIGHT * fm + fb);
				const stack: [number, number, number, number, number, number, number][] = [
					[a, b, fa, fm, fb, whole, 0],
				];

				while (stack.length > 0) {
					const frame = stack.pop()!;
					const [left, right, fLeft, fMiddle, fRight, previous, depth] = frame;
					const middle = (left + right) * HALF;
					const leftMiddle = (left + middle) * HALF;
					const rightMiddle = (middle + right) * HALF;
					const fLeftMiddle = fn(leftMiddle);
					const fRightMiddle = fn(rightMiddle);
					const leftIntegral =
						((middle - left) / SIMPSON_DIVISOR) *
						(fLeft + SIMPSON_MIDDLE_WEIGHT * fLeftMiddle + fMiddle);
					const rightIntegral =
						((right - middle) / SIMPSON_DIVISOR) *
						(fMiddle + SIMPSON_MIDDLE_WEIGHT * fRightMiddle + fRight);
					const refined = leftIntegral + rightIntegral;

					if (
						depth >= MAX_DEPTH ||
						Math.abs(refined - previous) <=
							(SIMPSON_ERROR_FACTOR * INTEGRATION_TOLERANCE) / segments
					) {
						total += refined + (refined - previous) / SIMPSON_ERROR_FACTOR;
					} else {
						stack.push([
							middle,
							right,
							fMiddle,
							fRightMiddle,
							fRight,
							rightIntegral,
							depth + 1,
						]);
						stack.push([
							left,
							middle,
							fLeft,
							fLeftMiddle,
							fMiddle,
							leftIntegral,
							depth + 1,
						]);
					}
				}

				a = b;
			}

			retval = sign * total;
		}
	}

	return retval;
}

/** Numerical Fresnel sine integral for compiled expressions. */
export function fresnelS(x: number): number {
	const retval = fresnelIntegral(x, 1);
	return retval;
}

/** Numerical Fresnel cosine integral for compiled expressions. */
export function fresnelC(x: number): number {
	const retval = fresnelIntegral(x, 0);
	return retval;
}
