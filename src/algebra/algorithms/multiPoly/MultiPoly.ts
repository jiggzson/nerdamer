/**
 * Sparse multivariate polynomial over integer coefficients.
 *
 * @remarks
 * Monomials are stored in a mutable map from canonical exponent keys to `bigint`
 * coefficients. Variable indices, rather than names, define the polynomial ring; every
 * polynomial combined by an algorithm must use the same index-to-name mapping.
 * Exponents are expected to be non-negative integers, but construction helpers do not
 * validate that requirement.
 *
 * The constructor copies the supplied map, so {@link MultiPoly.clone} has independent
 * term storage. The public {@link MultiPoly.terms} property, on the other hand, exposes
 * the live map. Direct edits must use canonical keys and remove zero coefficients;
 * {@link MultiPoly.setCoeff} is the safer choice for ordinary updates.
 *
 * This is the exact representation used by the advanced Groebner layer. It does not
 * represent rational coefficients directly; expression-facing adapters clear
 * denominators before conversion.
 */
export class MultiPoly {
	/** Live term map keyed by canonical monomial strings. */
	terms: Map<string, bigint>;

	/**
	 * Creates a polynomial by copying the supplied term map.
	 *
	 * @param terms - Initial canonical-monomial-key to integer-coefficient map.
	 */
	constructor(terms?: Map<string, bigint>) {
		this.terms = terms ? new Map(terms) : new Map();
	}

	/**
	 * Creates a constant polynomial, omitting storage for zero.
	 *
	 * @param c - Integer constant.
	 */
	static constant(c: bigint): MultiPoly {
		const p = new MultiPoly();
		if (c !== 0n) {
			p.terms.set('', c);
		}
		return p;
	}

	/**
	 * Creates the monomial `coeff * x₀^e₀ * x₁^e₁ * ...`.
	 *
	 * @param coeff - Integer coefficient.
	 * @param exponents - Exponents indexed by variable number.
	 */
	static monomial(coeff: bigint, exponents: number[]): MultiPoly {
		const p = new MultiPoly();
		if (coeff === 0n) {
			return p;
		}
		const exp: Exponents = new Map();
		for (let i = 0; i < exponents.length; i++) {
			if (exponents[i] !== 0) {
				exp.set(i, exponents[i]);
			}
		}
		p.terms.set(expToKey(exp), coeff);
		return p;
	}

	/**
	 * Creates the constant polynomial one.
	 */
	static one() {
		return MultiPoly.constant(1n);
	}

	/**
	 * Creates the single-variable polynomial `xᵢ`.
	 *
	 * @param varIndex - Variable index to raise to the first power.
	 */
	static variable(varIndex: number): MultiPoly {
		const p = new MultiPoly();
		const exp: Exponents = new Map([[varIndex, 1]]);
		p.terms.set(expToKey(exp), 1n);
		return p;
	}

	/**
	 * Creates the zero polynomial with empty term storage.
	 */
	static zero(): MultiPoly {
		return new MultiPoly();
	}

	/**
	 * Creates an independent copy of the term map.
	 */
	clone(): MultiPoly {
		return new MultiPoly(new Map(this.terms));
	}

	/**
	 * Returns the constant coefficient, or zero when absent.
	 */
	constantTerm(): bigint {
		return this.terms.get('') ?? 0n;
	}

	/**
	 * Returns the greatest exponent of one variable.
	 *
	 * @param varIndex - Variable index to inspect.
	 * @returns `-1` for zero; otherwise a non-negative degree.
	 */
	degree(varIndex: number): number {
		let maxDeg = -1;
		for (const key of this.terms.keys()) {
			const exp = keyToExp(key);
			const d = exp.get(varIndex) ?? 0;
			if (d > maxDeg) {
				maxDeg = d;
			}
		}
		return this.terms.size === 0 ? -1 : maxDeg;
	}

	/**
	 * Returns a monomial coefficient from dense exponents.
	 *
	 * @param exponents - Exponents indexed by variable number.
	 * @returns The stored coefficient, or zero when absent.
	 */
	getCoeff(exponents: number[]): bigint {
		const exp: Exponents = new Map();
		for (let i = 0; i < exponents.length; i++) {
			if (exponents[i] !== 0) {
				exp.set(i, exponents[i]);
			}
		}
		return this.terms.get(expToKey(exp)) ?? 0n;
	}

	/**
	 * Tests whether this polynomial is zero or contains only a constant term.
	 */
	isConstant(): boolean {
		if (this.terms.size === 0) {
			return true;
		}
		if (this.terms.size === 1 && this.terms.has('')) {
			return true;
		}
		return false;
	}

	/**
	 * Tests whether the term map is empty.
	 */
	isZero(): boolean {
		return this.terms.size === 0;
	}

	/**
	 * Extracts the coefficient of the highest power of one variable.
	 *
	 * The selected variable is removed from those leading terms, so the coefficient is
	 * itself returned as a new polynomial in the remaining variables.
	 *
	 * @param varIndex - Variable whose greatest power is selected and removed.
	 * @returns A new polynomial in the remaining variables.
	 */
	leadingCoeff(varIndex: number): MultiPoly {
		const deg = this.degree(varIndex);
		if (deg < 0) {
			return MultiPoly.zero();
		}

		const result = new MultiPoly();
		for (const [key, coeff] of this.terms) {
			const exp = keyToExp(key);
			if ((exp.get(varIndex) ?? 0) === deg) {
				// Remove varIndex from exponents
				const newExp = new Map(exp);
				newExp.delete(varIndex);
				result.terms.set(expToKey(newExp), coeff);
			}
		}
		return result;
	}

	/**
	 * Sets or removes a monomial coefficient in place.
	 *
	 * @param exponents - Dense exponents indexed by variable number.
	 * @param coeff - Integer coefficient; zero removes the monomial.
	 */
	setCoeff(exponents: number[], coeff: bigint): void {
		const exp: Exponents = new Map();
		for (let i = 0; i < exponents.length; i++) {
			if (exponents[i] !== 0) {
				exp.set(i, exponents[i]);
			}
		}
		const key = expToKey(exp);
		if (coeff === 0n) {
			this.terms.delete(key);
		} else {
			this.terms.set(key, coeff);
		}
	}

	/**
	 * Formats this polynomial using caller-supplied variable names.
	 *
	 * @param varNames - Names aligned with variable indices; missing names fall back to `xN`.
	 * @returns Deterministic text ordered by descending total degree and canonical key.
	 */
	text(varNames: string[]): string {
		if (this.terms.size === 0) {
			return '0';
		}

		const names = varNames;
		const termStrs: string[] = [];

		// Sort terms for consistent output
		const sortedTerms = Array.from(this.terms.entries()).sort(([keyA], [keyB]) =>
			compareKeyTotalDegDescThenLex(keyA, keyB)
		);

		for (const [key, coeff] of sortedTerms) {
			const exp = keyToExp(key);

			let termStr = '';

			// Handle coefficient
			const absCoeff = coeff < 0n ? -coeff : coeff;
			const sign = coeff < 0n ? '-' : '+';

			if (exp.size === 0) {
				// Constant term
				termStr = absCoeff.toString();
			} else {
				// Has variables
				if (absCoeff !== 1n) {
					termStr = absCoeff.toString();
				}

				for (const [v, e] of Array.from(exp.entries()).sort((a, b) => a[0] - b[0])) {
					const varName = v < names.length ? names[v] : `x${v}`;
					if (e === 1) {
						termStr += varName;
					} else {
						termStr += `${varName}^${e}`;
					}
				}

				if (termStr === '') {
					termStr = '1';
				}
			}

			termStrs.push(
				(termStrs.length === 0 ? (sign === '+' ? '' : '-') : ` ${sign} `) + termStr
			);
		}

		return termStrs.join('') || '0';
	}

	/**
	 * Returns the maximum sum of exponents among all monomials.
	 *
	 * @returns `-1` for the zero polynomial.
	 */
	totalDegree(): number {
		let maxTotal = -1;
		for (const key of this.terms.keys()) {
			const exp = keyToExp(key);
			let total = 0;
			for (const e of exp.values()) {
				total += e;
			}
			if (total > maxTotal) {
				maxTotal = total;
			}
		}
		return this.terms.size === 0 ? -1 : maxTotal;
	}

	/**
	 * Removes zero-coefficient entries from the live term map in place.
	 */
	trim(): void {
		for (const [k, c] of this.terms.entries()) {
			if (c === 0n) {
				this.terms.delete(k);
			}
		}
	}

	/**
	 * Collects variable indices with at least one nonzero exponent.
	 *
	 * @returns A new set of variable indices.
	 */
	variables(): Set<number> {
		const vars = new Set<number>();
		for (const key of this.terms.keys()) {
			const exp = keyToExp(key);
			for (const v of exp.keys()) {
				vars.add(v);
			}
		}
		return vars;
	}
}

/**
 * Canonical monomial key utilities.
 *
 * Key format: "v:e,v:e,..." with strictly increasing v and e>0.
 * The empty string "" represents the constant monomial.
 */
export type Exponents = Map<number, number>;

/** Convert exponent map to canonical key. */
// NOTE: These helpers keep the `Impl` suffix used by the internal layout.
// The structural tests enforce that the public wrappers live in monomial-key.ts.
export function expToKey(exp: Exponents): string {
	const entries = Array.from(exp.entries())
		.filter(([, e]) => e !== 0)
		.sort((a, b) => a[0] - b[0]);
	if (entries.length === 0) {
		return '';
	}
	return entries.map(([v, e]) => `${v}:${e}`).join(',');
}

/** Parse a canonical key back to an exponent map. */
export function keyToExp(key: string): Exponents {
	const exp: Exponents = new Map();
	if (key === '') {
		return exp;
	}
	for (const part of key.split(',')) {
		const [vStr, eStr] = part.split(':');
		const v = Number(vStr);
		const e = Number(eStr);
		if (!Number.isFinite(v) || !Number.isFinite(e)) {
			throw new Error(`keyToExpImpl: invalid monomial key '${key}'`);
		}
		if (e !== 0) {
			exp.set(v, e);
		}
	}
	return exp;
}

/**
 * Sort callback: total degree descending, then lex by key string.
 * Matches the current ordering used by MultiPoly.toString().
 */
function compareKeyTotalDegDescThenLex(a: string, b: string): number {
	const da = keyTotalDegree(a);
	const db = keyTotalDegree(b);
	if (da !== db) {
		return db - da;
	}
	return a.localeCompare(b);
}

/** Total degree of a monomial key (sum of all exponents). */
function keyTotalDegree(key: string): number {
	if (key === '') {
		return 0;
	}
	let s = 0;
	for (const part of key.split(',')) {
		const [, eStr] = part.split(':');
		s += Number(eStr);
	}
	return s;
}
