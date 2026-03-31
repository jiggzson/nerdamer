import Decimal from 'decimal.js';

export type DecimalFn = (x: Decimal) => Decimal;

export interface DefIntOptions {
	/** Absolute tolerance target. Default: 1e-(Decimal.precision-5) */
	tolAbs?: Decimal.Value;

	/** Relative tolerance target (scaled to |I|). Default: 1e-(Decimal.precision-5) */
	tolRel?: Decimal.Value;

	/** Max adaptive subdivision depth. Default: 40 */
	maxDepth?: number;

	/** Hard cap on function evaluations. Default: 300_000 */
	maxEvals?: number;

	/**
	 * Singular/discontinuous handling:
	 * - "auto": try to detect non-finite/NaN spikes and bisect around them (best-effort)
	 * - "strict": throw on non-finite/NaN
	 * - "ignore": propagate NaN (returns NaN)
	 */
	singular?: 'auto' | 'strict' | 'ignore';

	/**
	 * Optional known breakpoints inside (a,b) where f may change behavior (abs, piecewise, etc).
	 * Integration runs separately on each segment for robustness.
	 */
	breakpoints?: Decimal.Value[];

	/**
	 * For infinite bounds: set to true to support +/-Infinity with variable substitutions.
	 * Default false (throws if infinite bounds are used).
	 */
	allowInfinite?: boolean;

	/** If true, returns 0 immediately when a==b (default true). */
	fastZeroWidth?: boolean;
}

const TWO = new Decimal(2);
const FOUR = new Decimal(4);
const SIX = new Decimal(6);
const FIFTEEN = new Decimal(15);
const ONE = new Decimal(1);
const ZERO = new Decimal(0);

function D(v: Decimal.Value): Decimal {
	return v instanceof Decimal ? v : new Decimal(v);
}
function absD(x: Decimal): Decimal {
	return x.isNeg() ? x.neg() : x;
}
function isFiniteDecimal(x: Decimal): boolean {
	// decimal.js: finite numbers are !isNaN and !isInfinite
	return !x.isNaN() && x.isFinite();
}
function defaultTolFromPrecision(): Decimal {
	// A decent default: about 5 digits of slack vs working precision
	// e.g. precision 50 -> tol ~ 1e-45
	const p = Decimal.precision ?? 20;
	const e = Math.max(1, p - 5);
	return new Decimal(10).pow(-e);
}

function simpson(a: Decimal, b: Decimal, fa: Decimal, fm: Decimal, fb: Decimal): Decimal {
	// (b-a)/6 * (fa + 4*fm + fb)
	return b
		.sub(a)
		.div(SIX)
		.mul(fa.add(fm.mul(FOUR)).add(fb));
}

type Frame = {
	a: Decimal;
	b: Decimal;
	m: Decimal;
	fa: Decimal;
	fm: Decimal;
	fb: Decimal;
	S: Decimal;
	depth: number;
	// segment budget
	tolAbs: Decimal;
	tolRel: Decimal;
	// best-effort singular handling counter
	singularTries: number;
};

function withFiniteBounds(
	f: DecimalFn,
	aIn: Decimal,
	bIn: Decimal,
	opts: Required<Pick<DefIntOptions, 'maxDepth' | 'maxEvals' | 'singular'>> & {
		tolAbs: Decimal;
		tolRel: Decimal;
	}
): Decimal {
	let a = aIn;
	let b = bIn;

	if (a.eq(b)) {
		return ZERO;
	}

	// reverse if needed
	let sign = ONE;
	if (b.lt(a)) {
		sign = sign.neg();
		const t = a;
		a = b;
		b = t;
	}

	let evals = 0;

	const evalF = (x: Decimal): Decimal => {
		if (evals++ > opts.maxEvals) {
			throw new Error(`defint: maxEvals exceeded (${opts.maxEvals}).`);
		}
		const y = f(x);
		if (opts.singular === 'strict') {
			if (!isFiniteDecimal(y)) {
				throw new Error(`defint: non-finite f(x) at x=${x.toString()}`);
			}
		}
		return y;
	};

	const m0 = a.add(b).div(TWO);
	const fa = evalF(a);
	const fm = evalF(m0);
	const fb = evalF(b);

	if (opts.singular === 'ignore') {
		if (fa.isNaN() || fm.isNaN() || fb.isNaN()) {
			return new Decimal(NaN);
		}
	}

	// If auto and we hit non-finite early, bisect around it (best-effort).
	if (opts.singular === 'auto') {
		if (!isFiniteDecimal(fa) || !isFiniteDecimal(fm) || !isFiniteDecimal(fb)) {
			// Try to integrate by splitting once; if still bad, throw.
			const mid = m0;
			const left = tryAutoSplitFinite(f, a, mid, opts);
			const right = tryAutoSplitFinite(f, mid, b, opts);
			return left.add(right).mul(sign);
		}
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
			tolAbs: opts.tolAbs,
			tolRel: opts.tolRel,
			singularTries: 0,
		},
	];

	let acc = ZERO;

	while (stack.length) {
		const fr = stack.pop()!;
		const a0 = fr.a;
		const b0 = fr.b;
		const m = fr.m;

		const lm = a0.add(m).div(TWO);
		const rm = m.add(b0).div(TWO);

		const fLM = evalF(lm);
		const fRM = evalF(rm);

		if (opts.singular === 'ignore') {
			if (fLM.isNaN() || fRM.isNaN() || fr.fa.isNaN() || fr.fm.isNaN() || fr.fb.isNaN()) {
				return new Decimal(NaN);
			}
		}

		if (opts.singular === 'auto') {
			// If we encounter a non-finite value, try splitting more locally a few times.
			if (
				!isFiniteDecimal(fLM) ||
				!isFiniteDecimal(fRM) ||
				!isFiniteDecimal(fr.fa) ||
				!isFiniteDecimal(fr.fm) ||
				!isFiniteDecimal(fr.fb)
			) {
				if (fr.depth >= opts.maxDepth || fr.singularTries >= 8) {
					throw new Error(
						`defint: singular/non-finite encountered near [${a0.toString()}, ${b0.toString()}]`
					);
				}
				// Push children without using Simpson error test; just refine around the issue.
				const nextDepth = fr.depth + 1;
				const childTolAbs = fr.tolAbs.div(TWO);
				const childTolRel = fr.tolRel.div(TWO);

				// We need f at new midpoints; reuse what we already have when finite.
				// For left child: [a0,m], midpoint=lm, endpoints fa and fm
				// For right child:[m,b0], midpoint=rm, endpoints fm and fb
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
		}

		const Sleft = simpson(a0, m, fr.fa, fLM, fr.fm);
		const Sright = simpson(m, b0, fr.fm, fRM, fr.fb);
		const S2 = Sleft.add(Sright);

		// Error estimate and acceptance test
		const err = absD(S2.sub(fr.S)).div(FIFTEEN);

		// Relative scaling: accept if err <= tolAbs + tolRel*|S2|
		const scale = fr.tolAbs.add(fr.tolRel.mul(absD(S2)));

		if (err.lte(scale) || fr.depth >= opts.maxDepth) {
			const improved = S2.add(S2.sub(fr.S).div(FIFTEEN)); // Richardson
			acc = acc.add(improved);
			continue;
		}

		const nextDepth = fr.depth + 1;
		const childTolAbs = fr.tolAbs.div(TWO);
		const childTolRel = fr.tolRel.div(TWO);

		// push right then left
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

	return acc.mul(sign);
}

function tryAutoSplitFinite(
	f: DecimalFn,
	a: Decimal,
	b: Decimal,
	opts: Required<Pick<DefIntOptions, 'maxDepth' | 'maxEvals' | 'singular'>> & {
		tolAbs: Decimal;
		tolRel: Decimal;
	}
): Decimal {
	// One extra level of protection: split into 4 chunks and integrate those that remain finite.
	const m = a.add(b).div(TWO);
	const q1 = a.add(m).div(TWO);
	const q3 = m.add(b).div(TWO);

	// Integrate each segment with slightly looser tolerances (since we subdivided already).
	const tolAbs = opts.tolAbs.div(FOUR);
	const tolRel = opts.tolRel.div(FOUR);

	return withFiniteBounds(f, a, q1, { ...opts, tolAbs, tolRel })
		.add(withFiniteBounds(f, q1, m, { ...opts, tolAbs, tolRel }))
		.add(withFiniteBounds(f, m, q3, { ...opts, tolAbs, tolRel }))
		.add(withFiniteBounds(f, q3, b, { ...opts, tolAbs, tolRel }));
}

/**
 * Definite integral using adaptive Simpson + decimal.js.
 * - Smooth functions: typically very fast.
 * - Nasty cases: supports breakpoints, best-effort singular handling, optional infinite bounds.
 */
export function definiteIntegrate(
	f: DecimalFn,
	a: Decimal.Value,
	b: Decimal.Value,
	options: DefIntOptions = {}
): Decimal {
	const A = D(a);
	const B = D(b);

	const fastZeroWidth = options.fastZeroWidth ?? true;
	if (fastZeroWidth && A.eq(B)) {
		return ZERO;
	}

	// tolerances
	const baseTol = defaultTolFromPrecision();
	const tolAbs = D(options.tolAbs ?? baseTol);
	const tolRel = D(options.tolRel ?? baseTol);

	const maxDepth = options.maxDepth ?? 40;
	const maxEvals = options.maxEvals ?? 300_000;
	const singular = options.singular ?? 'auto';

	// Optional breakpoints segmentation (recommended for piecewise/abs/kinks/discontinuities)
	const bps = (options.breakpoints ?? [])
		.map(D)
		.filter(x => x.gt(Decimal.min(A, B)) && x.lt(Decimal.max(A, B)))
		.sort((x, y) => (x.lt(y) ? -1 : x.gt(y) ? 1 : 0));

	const allowInfinite = options.allowInfinite ?? false;

	const isInfA = !A.isFinite() && !A.isNaN();
	const isInfB = !B.isFinite() && !B.isNaN();

	if ((isInfA || isInfB) && !allowInfinite) {
		throw new Error(`defint: infinite bounds require allowInfinite:true`);
	}

	const coreOpts = { tolAbs, tolRel, maxDepth, maxEvals, singular } as const;

	// Handle infinite bounds with standard substitutions:
	// (1) a finite, b = +inf: x = a + t/(1-t), t in [0,1)
	// (2) a = -inf, b finite: x = b - t/(1-t), t in [0,1)
	// (3) a=-inf, b=+inf: x = tan(pi*(t-1/2)), t in (0,1)
	//
	// NOTE: These are robust but may need higher maxDepth for oscillatory/singular functions.
	if (allowInfinite && (isInfA || isInfB)) {
		if (!isInfA && isInfB && B.isPos()) {
			const a0 = A;
			const g: DecimalFn = t => {
				// x = a + t/(1-t)
				const oneMinusT = ONE.sub(t);
				const x = a0.add(t.div(oneMinusT));
				// dx/dt = 1/(1-t)^2
				const dxdt = ONE.div(oneMinusT.mul(oneMinusT));
				return f(x).mul(dxdt);
			};
			// integrate t in [0,1] but avoid evaluating at 1 exactly
			const eps = new Decimal(10).pow(-(Decimal.precision ?? 20) + 2);
			return withFiniteBounds(g, ZERO, ONE.sub(eps), coreOpts);
		}

		if (isInfA && A.isNeg() && !isInfB) {
			const b0 = B;
			const g: DecimalFn = t => {
				const oneMinusT = ONE.sub(t);
				const x = b0.sub(t.div(oneMinusT));
				const dxdt = ONE.div(oneMinusT.mul(oneMinusT));
				return f(x).mul(dxdt);
			};
			const eps = new Decimal(10).pow(-(Decimal.precision ?? 20) + 2);
			return withFiniteBounds(g, ZERO, ONE.sub(eps), coreOpts);
		}

		if (isInfA && A.isNeg() && isInfB && B.isPos()) {
			// x = tan(pi*(t-1/2)), dx/dt = pi*sec^2(...)
			const PI = Decimal.acos(-1);
			const g: DecimalFn = t => {
				const u = PI.mul(t.sub(new Decimal('0.5')));
				const x = Decimal.tan(u);
				const sec2 = ONE.div(Decimal.cos(u).pow(2));
				const dxdt = PI.mul(sec2);
				return f(x).mul(dxdt);
			};
			const eps = new Decimal(10).pow(-(Decimal.precision ?? 20) + 2);
			return withFiniteBounds(g, eps, ONE.sub(eps), coreOpts);
		}

		throw new Error(`defint: unsupported infinite bound configuration`);
	}

	// Finite-bounds path, with optional segmentation by breakpoints
	if (bps.length === 0) {
		return withFiniteBounds(f, A, B, coreOpts);
	}

	// Segment integration; allocate tolerance budget across segments
	const nSeg = bps.length + 1;
	const segTolAbs = tolAbs.div(nSeg);
	const segTolRel = tolRel; // keep relative tol the same per segment

	let total = ZERO;
	let start = A;
	for (const bp of bps) {
		total = total.add(
			withFiniteBounds(f, start, bp, { ...coreOpts, tolAbs: segTolAbs, tolRel: segTolRel })
		);
		start = bp;
	}
	total = total.add(
		withFiniteBounds(f, start, B, { ...coreOpts, tolAbs: segTolAbs, tolRel: segTolRel })
	);
	return total;
}
