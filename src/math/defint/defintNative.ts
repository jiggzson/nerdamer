/**
 * Adaptive Simpson definite integration using native `number` arithmetic.
 *
 * Same algorithm as the Decimal.js version (adaptive Simpson with Richardson
 * extrapolation, iterative stack) but 50-100x faster for typical integrands.
 *
 * Features:
 * - Adaptive error control with combined absolute + relative tolerance
 * - Breakpoint segmentation for piecewise/abs/kink functions
 * - Infinite bounds via variable substitution
 * - Best-effort singularity handling
 */

export type NumericFn = (x: number) => number;

export interface DefIntNativeOptions {
	/** Absolute tolerance. Default: 1e-12 */
	tolAbs?: number;

	/** Relative tolerance (scaled to |I|). Default: 1e-12 */
	tolRel?: number;

	/** Max adaptive subdivision depth. Default: 50 */
	maxDepth?: number;

	/** Hard cap on function evaluations. Default: 100_000 */
	maxEvals?: number;

	/**
	 * Singular/discontinuous handling:
	 * - "auto": detect non-finite spikes and bisect around them
	 * - "strict": throw on non-finite
	 * - "ignore": propagate NaN
	 */
	singular?: 'auto' | 'strict' | 'ignore';

	/**
	 * Known breakpoints inside (a,b) where f may change behavior.
	 * Integration runs separately on each segment.
	 */
	breakpoints?: number[];

	/**
	 * Support +/-Infinity bounds via variable substitution.
	 * Default: false.
	 */
	allowInfinite?: boolean;
}

const DEFAULT_TOL = 1e-12;
const MAX_SINGULAR_TRIES = 8;

// ── Helpers ──────────────────────────────────────────────────────────

function simpson(a: number, b: number, fa: number, fm: number, fb: number): number {
	return ((b - a) / 6) * (fa + 4 * fm + fb);
}

// ── Stack frame for iterative adaptive subdivision ───────────────────

interface Frame {
	a: number;
	b: number;
	m: number;
	fa: number;
	fm: number;
	fb: number;
	S: number;
	depth: number;
	tolAbs: number;
	tolRel: number;
	singularTries: number;
}

// ── Core: finite-bounds adaptive Simpson ─────────────────────────────

function withFiniteBounds(
	f: NumericFn,
	aIn: number,
	bIn: number,
	tolAbs: number,
	tolRel: number,
	maxDepth: number,
	maxEvals: number,
	singular: 'auto' | 'strict' | 'ignore'
): number {
	let a = aIn;
	let b = bIn;

	if (a === b) {
		return 0;
	}

	let sign = 1;
	if (b < a) {
		sign = -1;
		const t = a;
		a = b;
		b = t;
	}

	let evals = 0;

	const evalF = (x: number): number => {
		if (++evals > maxEvals) {
			throw new Error(`defint: maxEvals exceeded (${maxEvals}).`);
		}
		const y = f(x);
		if (singular === 'strict' && !isFinite(y)) {
			throw new Error(`defint: non-finite f(x) at x=${x}`);
		}
		return y;
	};

	const m0 = (a + b) / 2;
	const fa = evalF(a);
	const fm = evalF(m0);
	const fb = evalF(b);

	if (singular === 'ignore' && (isNaN(fa) || isNaN(fm) || isNaN(fb))) {
		return NaN;
	}

	// Auto-split if initial evaluations hit non-finite values
	if (singular === 'auto' && (!isFinite(fa) || !isFinite(fm) || !isFinite(fb))) {
		return sign * autoSplitFinite(f, a, b, tolAbs, tolRel, maxDepth, maxEvals, singular);
	}

	const S0 = simpson(a, b, fa, fm, fb);

	const stack: Frame[] = [
		{
			a,
			b,
			m: m0,
			fa,
			fm,
			fb,
			S: S0,
			depth: 0,
			tolAbs,
			tolRel,
			singularTries: 0,
		},
	];

	let acc = 0;

	while (stack.length) {
		const fr = stack.pop()!;
		const { a: a0, b: b0, m } = fr;

		const lm = (a0 + m) / 2;
		const rm = (m + b0) / 2;

		const fLM = evalF(lm);
		const fRM = evalF(rm);

		if (singular === 'ignore' && (isNaN(fLM) || isNaN(fRM))) {
			return NaN;
		}

		// Auto: bisect around non-finite values
		if (
			singular === 'auto' &&
			(!isFinite(fLM) ||
				!isFinite(fRM) ||
				!isFinite(fr.fa) ||
				!isFinite(fr.fm) ||
				!isFinite(fr.fb))
		) {
			if (fr.depth >= maxDepth || fr.singularTries >= MAX_SINGULAR_TRIES) {
				throw new Error(`defint: singular/non-finite encountered near [${a0}, ${b0}]`);
			}
			const nextDepth = fr.depth + 1;
			const childTolAbs = fr.tolAbs / 2;
			const childTolRel = fr.tolRel / 2;

			stack.push({
				a: m,
				b: b0,
				m: rm,
				fa: fr.fm,
				fm: fRM,
				fb: fr.fb,
				S: simpson(m, b0, fr.fm, fRM, fr.fb),
				depth: nextDepth,
				tolAbs: childTolAbs,
				tolRel: childTolRel,
				singularTries: fr.singularTries + 1,
			});
			stack.push({
				a: a0,
				b: m,
				m: lm,
				fa: fr.fa,
				fm: fLM,
				fb: fr.fm,
				S: simpson(a0, m, fr.fa, fLM, fr.fm),
				depth: nextDepth,
				tolAbs: childTolAbs,
				tolRel: childTolRel,
				singularTries: fr.singularTries + 1,
			});
			continue;
		}

		const Sleft = simpson(a0, m, fr.fa, fLM, fr.fm);
		const Sright = simpson(m, b0, fr.fm, fRM, fr.fb);
		const S2 = Sleft + Sright;

		const err = Math.abs(S2 - fr.S) / 15;
		const scale = fr.tolAbs + fr.tolRel * Math.abs(S2);

		if (err <= scale || fr.depth >= maxDepth) {
			// Richardson extrapolation
			acc += S2 + (S2 - fr.S) / 15;
			continue;
		}

		const nextDepth = fr.depth + 1;
		const childTolAbs = fr.tolAbs / 2;
		const childTolRel = fr.tolRel / 2;

		// Push right then left so left is processed first (LIFO)
		stack.push({
			a: m,
			b: b0,
			m: rm,
			fa: fr.fm,
			fm: fRM,
			fb: fr.fb,
			S: Sright,
			depth: nextDepth,
			tolAbs: childTolAbs,
			tolRel: childTolRel,
			singularTries: fr.singularTries,
		});
		stack.push({
			a: a0,
			b: m,
			m: lm,
			fa: fr.fa,
			fm: fLM,
			fb: fr.fm,
			S: Sleft,
			depth: nextDepth,
			tolAbs: childTolAbs,
			tolRel: childTolRel,
			singularTries: fr.singularTries,
		});
	}

	return acc * sign;
}

// ── Auto-split helper for singular endpoints ─────────────────────────

function autoSplitFinite(
	f: NumericFn,
	a: number,
	b: number,
	tolAbs: number,
	tolRel: number,
	maxDepth: number,
	maxEvals: number,
	singular: 'auto' | 'strict' | 'ignore'
): number {
	const m = (a + b) / 2;
	const q1 = (a + m) / 2;
	const q3 = (m + b) / 2;
	const segTol = tolAbs / 4;

	return (
		withFiniteBounds(f, a, q1, segTol, tolRel, maxDepth, maxEvals, singular) +
		withFiniteBounds(f, q1, m, segTol, tolRel, maxDepth, maxEvals, singular) +
		withFiniteBounds(f, m, q3, segTol, tolRel, maxDepth, maxEvals, singular) +
		withFiniteBounds(f, q3, b, segTol, tolRel, maxDepth, maxEvals, singular)
	);
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Definite integral of `f` from `a` to `b` using adaptive Simpson's rule
 * with Richardson extrapolation, native `number` arithmetic.
 *
 * @example
 * ```ts
 * // ∫₀^π sin(x) dx = 2
 * definiteIntegrate(Math.sin, 0, Math.PI);
 *
 * // With breakpoints for |x|
 * definiteIntegrate(x => Math.abs(x), -1, 1, { breakpoints: [0] });
 *
 * // Improper integral ∫₁^∞ 1/x² dx = 1
 * definiteIntegrate(x => 1/(x*x), 1, Infinity, { allowInfinite: true });
 * ```
 */
export function definiteIntegrateNative(
	f: NumericFn,
	a: number,
	b: number,
	options: DefIntNativeOptions = {}
): number {
	if (a === b) {
		return 0;
	}

	const tolAbs = options.tolAbs ?? DEFAULT_TOL;
	const tolRel = options.tolRel ?? DEFAULT_TOL;
	const maxDepth = options.maxDepth ?? 50;
	const maxEvals = options.maxEvals ?? 100_000;
	const singular = options.singular ?? 'auto';
	const allowInfinite = options.allowInfinite ?? false;

	const isInfA = !isFinite(a) && !isNaN(a);
	const isInfB = !isFinite(b) && !isNaN(b);

	if ((isInfA || isInfB) && !allowInfinite) {
		throw new Error('defint: infinite bounds require allowInfinite: true');
	}

	// ── Infinite-bound substitutions ─────────────────────────────

	if (allowInfinite && (isInfA || isInfB)) {
		// Guard against very small eps clamping to 0 in float64
		const eps = 1e-15;

		if (!isInfA && isInfB && b > 0) {
			// ∫_a^∞  →  t ∈ [0, 1-eps], x = a + t/(1-t), dx = 1/(1-t)²
			const a0 = a;
			const g: NumericFn = t => {
				const u = 1 - t;
				const x = a0 + t / u;
				return f(x) / (u * u);
			};
			return withFiniteBounds(g, 0, 1 - eps, tolAbs, tolRel, maxDepth, maxEvals, singular);
		}

		if (isInfA && a < 0 && !isInfB) {
			// ∫_{-∞}^b  →  t ∈ [0, 1-eps], x = b - t/(1-t)
			const b0 = b;
			const g: NumericFn = t => {
				const u = 1 - t;
				const x = b0 - t / u;
				return f(x) / (u * u);
			};
			return withFiniteBounds(g, 0, 1 - eps, tolAbs, tolRel, maxDepth, maxEvals, singular);
		}

		if (isInfA && a < 0 && isInfB && b > 0) {
			// ∫_{-∞}^{∞}  →  t ∈ [eps, 1-eps], x = tan(π(t - ½))
			const g: NumericFn = t => {
				const u = Math.PI * (t - 0.5);
				const cosU = Math.cos(u);
				// dx/dt = π / cos²(u)
				return (f(Math.tan(u)) * Math.PI) / (cosU * cosU);
			};
			return withFiniteBounds(g, eps, 1 - eps, tolAbs, tolRel, maxDepth, maxEvals, singular);
		}

		throw new Error('defint: unsupported infinite bound configuration');
	}

	// ── Finite bounds with optional breakpoints ──────────────────

	const lo = Math.min(a, b);
	const hi = Math.max(a, b);

	const bps = (options.breakpoints ?? []).filter(x => x > lo && x < hi).sort((x, y) => x - y);

	if (bps.length === 0) {
		return withFiniteBounds(f, a, b, tolAbs, tolRel, maxDepth, maxEvals, singular);
	}

	// Segment integration with tolerance budget split across segments
	const nSeg = bps.length + 1;
	const segTolAbs = tolAbs / nSeg;

	// Determine integration direction
	const forward = a <= b;
	const points = forward ? [a, ...bps, b] : [a, ...bps.reverse(), b];

	let total = 0;
	for (let i = 0; i < points.length - 1; i++) {
		total += withFiniteBounds(
			f,
			points[i],
			points[i + 1],
			segTolAbs,
			tolRel,
			maxDepth,
			maxEvals,
			singular
		);
	}
	return total;
}
