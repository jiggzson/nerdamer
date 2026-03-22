import { gcd, GcdBudgetExceededError, pow } from './arith';
import { MultiPoly, keyToExp, expToKey } from './multiPoly/MultiPoly';
import {
	type Vars,
	denseToKey,
	substituteVarIndex,
	removeVarIndex,
	addVarIndex,
	addPoly,
	mulPoly,
	scalePoly,
	mvNormalize,
	mapCombineInPlace,
	mvExactDiv,
	mvNormalizePrimitiveSignLex,
	mvDivideByCoeffContent,
	zGcdFull,
	zNormalizePrimitiveSign,
	leadTermLex,
} from './poly';
import { type Rat, rat, ratAdd, ratMul, interpolateUnivariateRat } from './rational';

/**
 * Options for multivariate modular GCD (Zippel-style).
 *
 * Budgets:
 * - `maxTries`: maximum number of random/scheduled evaluation attempts.
 * - `throwOnBudget`: if true, throw `GcdBudgetExceededError` instead of returning a degenerate gcd.
 */
interface ZippelGCDOptions {
	mainVar?: string; // default: vars[0]
	maxTries?: number; // default: 32
	/** If true, exceeding the specialization/interpolation budget throws GcdBudgetExceededError. */
	throwOnBudget?: boolean;
	sampleBase?: bigint; // default: 2n (we use 2,3,4,... per variable interpolation)
	// Optional structured sampling grid per variable (replaces the old manual gridMap tuning).
	// If omitted, we auto-generate a small grid; for the first non-main variable we use a larger grid based on degrees.
	gridMap?: Record<string, bigint[]>;
	// Degree bounds: if you can provide these, reconstruction is much more reliable.
	// If omitted, we use a conservative bound from specialized univariate gcd degree only (works for small cases).
}

/**
 * Public API for multivariate integer GCD in the canonical `MultiPoly` representation.
 */
export function zippelGCDMulti(
	f: MultiPoly,
	g: MultiPoly,
	vars: Vars,
	opts: ZippelGCDOptions = {}
): MultiPoly {
	return zippelGCD(f, g, vars, opts);
}

/**
 * Compute the greatest common divisor of two multivariate integer polynomials.
 *
 * @remarks
 * This is a Zippel/Wang-style approach:
 *  - reduce to modular images (Fp)
 *  - evaluate/specialize variables to univariate instances
 *  - lift/interpolate back to a multivariate gcd
 */
function zippelGCD(f: MultiPoly, g: MultiPoly, vars: Vars, opts: ZippelGCDOptions = {}): MultiPoly {
	if (vars.length === 0) {
		throw new Error('zippelGCD: no variables');
	}

	const fNorm = mvNormalize(f);
	const gNorm = mvNormalize(g);

	// Handle zero cases up front
	if (fNorm.terms.size === 0 && gNorm.terms.size === 0) {
		return MultiPoly.zero();
	}
	if (fNorm.terms.size === 0) {
		return normalizeSignLex(gNorm, vars);
	}
	if (gNorm.terms.size === 0) {
		return normalizeSignLex(fNorm, vars);
	}

	// Remove coefficient content first
	const F = mvDivideByCoeffContent(fNorm);
	const G = mvDivideByCoeffContent(gNorm);
	const content = gcd(F.content, G.content);

	// OPTIMIZATION: Detect and substitute out variables that appear in only one polynomial.
	// Such variables cannot appear in the GCD (since the GCD must divide both polynomials).
	// We substitute them with primes, then drop those variables and recurse.
	{
		const fPrimMP0 = new MultiPoly(F.primitive.terms);
		const gPrimMP0 = new MultiPoly(G.primitive.terms);

		const activeInF = fPrimMP0.variables();
		const activeInG = gPrimMP0.variables();

		const superfluousVars: { idx: number; name: string }[] = [];
		for (let i = 0; i < vars.length; i++) {
			const inF = activeInF.has(i);
			const inG = activeInG.has(i);
			if (inF !== inG) {
				superfluousVars.push({ idx: i, name: vars[i] });
			}
		}

		if (superfluousVars.length > 0) {
			let fReducedMP = fPrimMP0;
			let gReducedMP = gPrimMP0;
			const varsReduced = [...vars];

			const primes = [17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n];
			for (let i = 0; i < superfluousVars.length; i++) {
				const { idx } = superfluousVars[i];
				const prime = primes[i % primes.length];
				fReducedMP = substituteVarIndex(fReducedMP, idx, prime);
				gReducedMP = substituteVarIndex(gReducedMP, idx, prime);
			}

			const sortedByIdxDesc = [...superfluousVars].sort((a, b) => b.idx - a.idx);
			for (const { idx } of sortedByIdxDesc) {
				fReducedMP = removeVarIndex(fReducedMP, idx);
				gReducedMP = removeVarIndex(gReducedMP, idx);
				varsReduced.splice(idx, 1);
			}

			// Reduced to constants?
			//
			// IMPORTANT:
			// At this point these constants are evaluation artifacts produced by substituting
			// variables that occur in only one input. Their numeric gcd is NOT, in general,
			// the polynomial gcd. Example:
			//   gcd(x+z, y+1) should be 1, but gcd((x+17), 18) can be some accidental integer.
			//
			// So when everything has been reduced away, the only safe gcd to return here is
			// the coefficient content gcd (or 1 for primitive inputs), not gcd(fConst, gConst).
			if (varsReduced.length === 0) {
				return MultiPoly.constant(content === 0n ? 1n : content);
			}

			const fReducedMV = fReducedMP;
			const gReducedMV = gReducedMP;

			let reducedMainVar = opts.mainVar ?? vars[0];
			if (!varsReduced.includes(reducedMainVar)) {
				reducedMainVar = varsReduced[0];
			}

			const reducedGcd = zippelGCD(fReducedMV, gReducedMV, varsReduced, {
				...opts,
				mainVar: reducedMainVar,
			});

			let outMP = reducedGcd.clone();
			const outVars = [...varsReduced];
			const sortedByIdxAsc = [...superfluousVars].sort((a, b) => a.idx - b.idx);
			for (const { idx, name } of sortedByIdxAsc) {
				outMP = addVarIndex(outMP, idx);
				outVars.splice(idx, 0, name);
			}

			let result = outMP;

			if (content !== 1n && content !== 0n) {
				result = scalePoly(result, content);
			}
			return normalizeSignLex(mvNormalize(result), vars);
		}
	}

	const mainVar = opts.mainVar ?? vars[0];
	const maxTries = opts.maxTries ?? 32;

	const fPrimMP = new MultiPoly(F.primitive.terms);
	const gPrimMP = new MultiPoly(G.primitive.terms);

	// 1) Find a "good" specialization to get a correct univariate gcd in mainVar
	let baseValues: Record<string, bigint> | null = null;
	let hBase: bigint[] | null = null;
	const gcdDegCounts = new Map<number, number>();
	let degFMain = -1;
	let degGMain = -1;

	for (let t = 0; t < maxTries; t++) {
		const values = randomEvalPoint(vars, mainVar, t);
		const fu = evalToUnivariate(fPrimMP, vars, mainVar, values);
		const gu = evalToUnivariate(gPrimMP, vars, mainVar, values);
		if (uniIsZeroBig(fu) || uniIsZeroBig(gu)) {
			continue;
		}

		const dF = fu.length - 1;
		const dG = gu.length - 1;
		if (degFMain < 0) {
			degFMain = dF;
			degGMain = dG;
		}
		if (dF !== degFMain || dG !== degGMain) {
			continue;
		}

		try {
			const hu = zNormalizePrimitiveSign(zGcdFull(fu, gu)).primitive;
			const hdeg = hu.length - 1;

			if (hdeg <= 0) {
				continue;
			}

			const prev = gcdDegCounts.get(hdeg) ?? 0;
			const next = prev + 1;
			gcdDegCounts.set(hdeg, next);

			if (next >= 2 && (!hBase || hdeg > hBase.length - 1)) {
				baseValues = values;
				hBase = zNormalizePrimitiveSign(hu).primitive;
			}
		} catch {
			continue;
		}
	}

	if (!baseValues || !hBase) {
		if (opts.throwOnBudget) {
			const degrees: Record<string, number> = {};
			for (const [deg, cnt] of gcdDegCounts.entries()) {
				degrees[String(deg)] = cnt;
			}
			throw new GcdBudgetExceededError(
				'zippelGCD: could not find a good specialization point within budget',
				{
					stage: 'base-specialization',
					vars: [...vars],
					mainVar,
					maxTries,
					degFMain,
					degGMain,
					gcdDegreeHistogram: degrees,
				}
			);
		}
		return MultiPoly.constant(content === 0n ? 1n : content);
	}

	const mainIdx = vars.indexOf(mainVar);
	const otherVars = vars.filter(v => v !== mainVar);
	const hDeg = hBase.length - 1;

	function sameUni(a: bigint[], b: bigint[]): boolean {
		const aa = zNormalizePrimitiveSign(a).primitive;
		const bb = zNormalizePrimitiveSign(b).primitive;
		if (aa.length !== bb.length) {
			return false;
		}
		for (let i = 0; i < aa.length; i++) {
			if (aa[i] !== bb[i]) {
				return false;
			}
		}
		return true;
	}

	function verifyCandidate(Hcand: MultiPoly): boolean {
		for (let k = 0; k < 6; k++) {
			const values = randomEvalPoint(vars, mainVar, 900000 + k);
			const fu = evalToUnivariate(fPrimMP, vars, mainVar, values);
			const gu = evalToUnivariate(gPrimMP, vars, mainVar, values);
			if (uniIsZeroBig(fu) || uniIsZeroBig(gu)) {
				continue;
			}
			const hu = zNormalizePrimitiveSign(zGcdFull(fu, gu)).primitive;
			if (hu.length - 1 !== hDeg) {
				return false;
			}
			const Hu = evalToUnivariate(Hcand, vars, mainVar, values);
			if (!sameUni(Hu, hu)) {
				return false;
			}
		}
		return true;
	}

	let best: MultiPoly | null = null;
	for (let attempt = 0; attempt < 8; attempt++) {
		const coeffPolys: MultiPoly[] = new Array(hDeg + 1);
		for (let d = 0; d <= hDeg; d++) {
			coeffPolys[d] = MultiPoly.zero();
		}

		for (let d = 0; d <= hDeg; d++) {
			let polyDmv: MultiPoly | null = null;
			for (let r = 0; r < 4 && !polyDmv; r++) {
				const samples = sampleCoefficientAcrossPoints(
					F.primitive,
					G.primitive,
					vars,
					mainVar,
					d,
					Math.min(maxTries * (r + 1), 64),
					attempt * 1000000 + r * 100000,
					opts.gridMap
				);
				try {
					polyDmv = interpolateCoeffAsMV(vars, otherVars, samples);
				} catch {
					polyDmv = null;
				}
			}
			if (!polyDmv) {
				throw new Error('zippelGCD: coefficient interpolation failed (non-integer)');
			}
			coeffPolys[d] = polyDmv.clone();
		}

		let Hmp = MultiPoly.zero();
		for (let d = 0; d <= hDeg; d++) {
			if (coeffPolys[d].terms.size === 0) {
				continue;
			}
			if (d === 0) {
				Hmp = addPoly(Hmp, coeffPolys[d]);
				continue;
			}
			const dense = new Array(vars.length).fill(0);
			dense[mainIdx] = d;
			const mon = new MultiPoly();
			mon.terms.set(denseToKey(dense), 1n);
			Hmp = addPoly(Hmp, mulPoly(coeffPolys[d], mon));
		}

		if (content !== 1n && content !== 0n) {
			Hmp = scalePoly(Hmp, content);
		}

		Hmp = mvNormalize(Hmp);
		Hmp = stripParamFactorFromMainVarCoeffsMP(Hmp, vars, mainVar);
		let H = Hmp.clone();
		H = normalizeSignLex(H, vars);

		best = H;
		if (verifyCandidate(H)) {
			return H;
		}
	}

	return best ? best : mvNormalize(MultiPoly.zero());
}

// Collect (assignment -> coeff_d) samples by computing univariate gcd at each assignment.
function sampleCoefficientAcrossPoints(
	f: MultiPoly,
	g: MultiPoly,
	vars: Vars,
	mainVar: string,
	coeffIndex: number,
	maxTries: number,
	seedOffset: number,
	gridMap: Record<string, bigint[]> | undefined
): Array<{ values: Record<string, bigint>; y: bigint }> {
	const out: Array<{ values: Record<string, bigint>; y: bigint }> = [];
	const otherVars = vars.filter(v => v !== mainVar);

	function maxDegInVar(p: MultiPoly, v: string): number {
		const idx = vars.indexOf(v);
		if (idx < 0) {
			return 0;
		}
		let m = 0;
		for (const k of p.terms.keys()) {
			const exp = keyToExp(k);
			const d = exp.get(idx) ?? 0;
			if (d > m) {
				m = d;
			}
		}
		return m;
	}

	function pointsForVar(v: string): bigint[] {
		const fromMap = gridMap?.[v];
		if (fromMap && fromMap.length) {
			return fromMap.slice();
		}

		// Use small primes as evaluation points to minimize gcd issues.
		// When evaluating ax² - b at points where gcd(a,b) > 1, the univariate
		// GCD content varies, breaking interpolation. Using primes helps avoid this.
		const primes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];

		if (otherVars.length && v === otherVars[0]) {
			const bound = Math.min(maxDegInVar(f, v), maxDegInVar(g, v));
			const n = Math.min(Math.max(bound + 1, 3), 15); // cap to avoid combinatorial blowup
			return primes.slice(0, n);
		}
		return [2n, 3n, 5n];
	}

	let expectedDegF = -1;
	let expectedDegG = -1;
	let expectedDegH = -1;

	// Build a small cartesian grid over otherVars, capped by maxTries.
	const cur: Record<string, bigint> = {};
	function rec(i: number, budget: { n: number }): void {
		if (budget.n <= 0) {
			return;
		}
		if (i === otherVars.length) {
			const values = { ...cur };
			const fu = evalToUnivariate(f, vars, mainVar, values);
			const gu = evalToUnivariate(g, vars, mainVar, values);
			if (uniIsZeroBig(fu) || uniIsZeroBig(gu)) {
				return;
			}
			const dF = fu.length - 1;
			const dG = gu.length - 1;
			// Prefer maximal degrees - degree drops indicate bad evaluation points
			if (dF > expectedDegF || dG > expectedDegG) {
				expectedDegF = Math.max(expectedDegF, dF);
				expectedDegG = Math.max(expectedDegG, dG);
				out.length = 0;
				expectedDegH = -1;
			}
			if (expectedDegF < 0) {
				expectedDegF = dF;
				expectedDegG = dG;
			}
			if (dF !== expectedDegF || dG !== expectedDegG) {
				return;
			}
			// Compute the GCD
			const huFull = zGcdFull(fu, gu);
			const hdeg = huFull.length - 1;
			// Prefer the *maximal* gcd degree seen so far.
			if (expectedDegH < 0 || hdeg > expectedDegH) {
				expectedDegH = hdeg;
				out.length = 0;
			}
			if (hdeg !== expectedDegH) {
				return;
			}
			const y = coeffIndex < huFull.length ? huFull[coeffIndex] : 0n;
			out.push({ values, y });
			budget.n--;
			return;
		}
		const v = otherVars[i];
		for (const pt of pointsForVar(v)) {
			cur[v] = pt;
			rec(i + 1, budget);
			if (budget.n <= 0) {
				break;
			}
		}
	}

	rec(0, { n: maxTries });

	// Fallback: if grid didn't produce enough, use independent random points.
	for (let t = 0; out.length < Math.min(6, maxTries) && t < maxTries * 2; t++) {
		const values = randomEvalPoint(vars, mainVar, seedOffset + 50000 + t);
		const fu = evalToUnivariate(f, vars, mainVar, values);
		const gu = evalToUnivariate(g, vars, mainVar, values);
		if (uniIsZeroBig(fu) || uniIsZeroBig(gu)) {
			continue;
		}
		const dF = fu.length - 1;
		const dG = gu.length - 1;
		if (dF > expectedDegF || dG > expectedDegG) {
			expectedDegF = Math.max(expectedDegF, dF);
			expectedDegG = Math.max(expectedDegG, dG);
			out.length = 0;
			expectedDegH = -1;
		}
		if (expectedDegF < 0) {
			expectedDegF = dF;
			expectedDegG = dG;
		}
		if (dF !== expectedDegF || dG !== expectedDegG) {
			continue;
		}
		const hu = zGcdFull(fu, gu);
		const hdeg = hu.length - 1;
		if (expectedDegH < 0 || hdeg > expectedDegH) {
			expectedDegH = hdeg;
			out.length = 0;
		}
		if (hdeg !== expectedDegH) {
			continue;
		}
		const y = coeffIndex < hu.length ? hu[coeffIndex] : 0n;
		out.push({ values, y });
	}

	if (out.length === 0) {
		return [{ values: randomEvalPoint(vars, mainVar, 9999), y: 0n }];
	}
	return out;
}

// Dense variable-by-variable interpolation for coeff(otherVars).
// This is the “practical” piece: it assumes low degrees and uses exact integer divisions.
// For bigger/heavier cases, you’ll want modular interpolation instead.
function interpolateCoeffAsMV(
	vars: Vars,
	otherVars: string[],
	samples: Array<{ values: Record<string, bigint>; y: bigint }>
): MultiPoly {
	// True nested interpolation over otherVars with rational intermediate coeffs.
	function groupKey(rest: string[], values: Record<string, bigint>): string {
		return rest.map(v => `${v}=${values[v] ?? 0n}`).join('|');
	}

	function recInterpolate(
		varsLeft: string[],
		ss: Array<{ values: Record<string, bigint>; y: Rat }>
	): MultiPolyF {
		if (varsLeft.length === 0) {
			const p = zeroMVF(vars);
			p.terms.set(denseToKey(new Array(vars.length).fill(0)), ss[0]?.y ?? rat(0n));
			return p;
		}
		const x = varsLeft[0];
		const rest = varsLeft.slice(1);
		const idx = vars.indexOf(x);
		if (idx < 0) {
			throw new Error('interpolateCoeffAsMV: missing var index');
		}
		// group by rest assignments
		const groups = new Map<
			string,
			Array<{ x: bigint; y: Rat; values: Record<string, bigint> }>
		>();
		for (const s of ss) {
			const k = groupKey(rest, s.values);
			const arr = groups.get(k) ?? [];
			arr.push({ x: s.values[x] ?? 0n, y: s.y, values: s.values });
			groups.set(k, arr);
		}

		// For each group, interpolate univariate in x to obtain coeffs (Rat[]) at that rest point.
		// IMPORTANT: do this in two passes so early groups are padded if a later group increases max degree.
		const groupUnis: Array<{ values: Record<string, bigint>; uni: Rat[] }> = [];
		let maxDeg = 0;
		for (const arr of groups.values()) {
			arr.sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
			const pts = arr.map(p => ({ x: p.x, y: p.y }));
			const uni = interpolateUnivariateRat(pts);
			maxDeg = Math.max(maxDeg, uni.length - 1);
			groupUnis.push({ values: arr[0].values, uni });
		}

		const coeffSamples: Array<Array<{ values: Record<string, bigint>; y: Rat }>> = new Array(
			maxDeg + 1
		);
		for (let d = 0; d <= maxDeg; d++) {
			coeffSamples[d] = [];
		}

		for (const gu of groupUnis) {
			for (let d = 0; d <= maxDeg; d++) {
				coeffSamples[d].push({
					values: gu.values,
					y: d < gu.uni.length ? gu.uni[d] : rat(0n),
				});
			}
		}

		let outF = zeroMVF(vars);
		for (let d = 0; d < coeffSamples.length; d++) {
			const sub = recInterpolate(rest, coeffSamples[d]);
			outF = addMVF(outF, shiftMVF(sub, idx, d));
		}
		return outF;
	}

	const ssRat = samples.map(s => ({ values: s.values, y: rat(s.y) }));
	const polyF = recInterpolate(otherVars, ssRat);
	return mvfToInt(polyF);
}

// Fractional multivariate poly (full vars), monomials -> rational coeff
type MultiPolyF = { vars: Vars; terms: Map<string, Rat> };

function zeroMVF(vars: Vars): MultiPolyF {
	return { vars, terms: new Map() };
}

function addMVF(a: MultiPolyF, b: MultiPolyF): MultiPolyF {
	const out: MultiPolyF = { vars: a.vars, terms: new Map(a.terms) };
	mapCombineInPlace(
		out.terms,
		b.terms,
		(x, y) => ratAdd(x, y),
		v => v.n === 0n,
		() => rat(0n)
	);
	return out;
}

function shiftMVF(p: MultiPolyF, varIdx: number, pow: number): MultiPolyF {
	const out = zeroMVF(p.vars);
	for (const [k, c] of p.terms.entries()) {
		const exp = keyToExp(k);
		exp.set(varIdx, (exp.get(varIdx) ?? 0) + pow);
		out.terms.set(expToKey(exp), c);
	}
	return out;
}

function mvfToInt(p: MultiPolyF): MultiPoly {
	const out = MultiPoly.zero();
	let lcmDen = 1n;
	for (const c of p.terms.values()) {
		if (c.n === 0n) {
			continue;
		}
		const d = c.d < 0n ? -c.d : c.d;
		lcmDen = (lcmDen / gcd(lcmDen, d)) * d;
	}
	for (const [k, c] of p.terms.entries()) {
		if (c.n === 0n) {
			continue;
		}
		const scaled = ratMul(c, rat(lcmDen));
		if (scaled.d !== 1n) {
			throw new Error('interpolateCoeffAsMV: failed to clear denominators');
		}
		out.terms.set(k, scaled.n);
	}
	return mvNormalize(out);
}

function randomEvalPoint(vars: Vars, mainVar: string, seed: number): Record<string, bigint> {
	const values: Record<string, bigint> = {};
	let state = BigInt(seed) ^ 0x9e3779b97f4a7c15n;
	function nextU32(): bigint {
		state = (state * 6364136223846793005n + 1442695040888963407n) & ((1n << 64n) - 1n);
		return (state >> 32n) & 0xffffffffn;
	}
	function hashVar(s: string): bigint {
		let h = 1469598103934665603n;
		for (let i = 0; i < s.length; i++) {
			h ^= BigInt(s.charCodeAt(i));
			h *= 1099511628211n;
			h &= (1n << 64n) - 1n;
		}
		return h;
	}
	for (const v of vars) {
		if (v === mainVar) {
			continue;
		}
		state ^= hashVar(v);
		const r = nextU32();
		values[v] = 2n + (r % 96n);
	}
	return values;
}

// Treat H as a univariate in mainVar with coefficients in Z[otherVars].
// Compute gcd of all coefficient-polynomials in otherVars and divide it out.
// This removes spurious parameter-only scaling factors that survive specialization.
function stripParamFactorFromMainVarCoeffsMP(H: MultiPoly, vars: Vars, mainVar: string): MultiPoly {
	const mainIdx = vars.indexOf(mainVar);
	if (mainIdx < 0) {
		return H;
	}
	const otherVars = vars.filter(v => v !== mainVar);
	if (otherVars.length === 0) {
		return H;
	}

	let maxDeg = 0;
	for (const k of H.terms.keys()) {
		const exp = keyToExp(k);
		const d = exp.get(mainIdx) ?? 0;
		if (d > maxDeg) {
			maxDeg = d;
		}
	}

	const coeffs: MultiPoly[] = new Array(maxDeg + 1);
	for (let d = 0; d <= maxDeg; d++) {
		coeffs[d] = MultiPoly.zero();
	}

	for (const [k, c] of H.terms.entries()) {
		const exp = keyToExp(k);
		const d = exp.get(mainIdx) ?? 0;
		const expOther = new Map(exp);
		expOther.delete(mainIdx);
		const kk = expToKey(expOther);
		coeffs[d].terms.set(kk, (coeffs[d].terms.get(kk) ?? 0n) + c);
	}
	for (const p of coeffs) {
		p.trim();
	}

	let Gc: MultiPoly | null = null;
	for (const cpoly of coeffs) {
		if (cpoly.terms.size === 0) {
			continue;
		}
		Gc = Gc ? zippelGCDMulti(Gc, cpoly, vars, { mainVar: otherVars[0], maxTries: 24 }) : cpoly;
		if (Gc.terms.size !== 0) {
			const gcn = mvNormalizePrimitiveSignLex(Gc).primitive;
			if (gcn.terms.size === 1 && (gcn.terms.get('') ?? 0n) === 1n) {
				Gc = gcn;
				break;
			}
		}
	}
	if (!Gc) {
		return H;
	}
	Gc = mvNormalizePrimitiveSignLex(Gc).primitive;
	if (Gc.terms.size === 0) {
		return H;
	}
	if (Gc.terms.size === 1 && (Gc.terms.get('') ?? 0n) === 1n) {
		return H;
	}

	const qCoeffs: MultiPoly[] = [];
	for (const cpoly of coeffs) {
		if (cpoly.terms.size === 0) {
			qCoeffs.push(cpoly);
			continue;
		}
		const q = mvExactDiv(cpoly, Gc);
		if (!q) {
			return H;
		}
		qCoeffs.push(q);
	}

	const Hq = MultiPoly.zero();
	for (let d = 0; d < qCoeffs.length; d++) {
		const q = qCoeffs[d];
		if (q.terms.size === 0) {
			continue;
		}
		for (const [kk, c] of q.terms.entries()) {
			const exp = keyToExp(kk);
			const expFull = new Map(exp);
			if (d !== 0) {
				expFull.set(mainIdx, d);
			}
			const kfull = expToKey(expFull);
			Hq.terms.set(kfull, (Hq.terms.get(kfull) ?? 0n) + c);
		}
	}
	Hq.trim();
	return Hq;
}

// ---------------------------
// Evaluation to univariate
// ---------------------------

function evalToUnivariate(
	p: MultiPoly,
	vars: readonly string[],
	mainVar: string,
	values: Record<string, bigint>
): bigint[] {
	const mainIdx = vars.indexOf(mainVar);
	if (mainIdx < 0) {
		throw new Error(`evalToUnivariate: main var ${mainVar} not in vars`);
	}

	let deg = 0;
	for (const k of p.terms.keys()) {
		const exp = keyToExp(k);
		deg = Math.max(deg, exp.get(mainIdx) ?? 0);
	}

	const coeffs: bigint[] = new Array(deg + 1).fill(0n);
	for (const [k, c] of p.terms.entries()) {
		const exp = keyToExp(k);
		const d = exp.get(mainIdx) ?? 0;
		let m = 1n;
		for (let i = 0; i < vars.length; i++) {
			if (i === mainIdx) {
				continue;
			}
			const vname = vars[i];
			const val = values[vname];
			if (val === undefined) {
				throw new Error(`evalToUnivariate: missing value for ${vname}`);
			}
			m *= pow(val, BigInt(exp.get(i) ?? 0));
		}
		coeffs[d] += c * m;
	}
	while (coeffs.length > 1 && coeffs[coeffs.length - 1] === 0n) {
		coeffs.pop();
	}
	return coeffs;
}

function uniIsZeroBig(a: bigint[]): boolean {
	return a.length === 0 || (a.length === 1 && a[0] === 0n);
}

function normalizeSignLex(p: MultiPoly, vars: Vars): MultiPoly {
	if (p.terms.size === 0) {
		return p;
	}
	const lt = leadTermLex(p, vars.length);
	if (!lt || lt.coeff >= 0n) {
		return p;
	}
	return scalePoly(p, -1n);
}
