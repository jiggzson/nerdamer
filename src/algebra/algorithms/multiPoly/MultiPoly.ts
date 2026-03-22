export class MultiPoly {
	// Map from exponent key to coefficient
	terms: Map<string, bigint>;

	constructor(terms?: Map<string, bigint>) {
		this.terms = terms ? new Map(terms) : new Map();
	}

	/**
	 * Create a constant polynomial
	 */
	static constant(c: bigint): MultiPoly {
		const p = new MultiPoly();
		if (c !== 0n) {
			p.terms.set('', c);
		}
		return p;
	}

	/**
	 * Create a monomial: c * x₀^e₀ * x₁^e₁ * ...
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
	 * Creates a one polynomial
	 * @returns
	 */
	static one() {
		return MultiPoly.constant(1n);
	}

	/**
	 * Create a single variable polynomial: xᵢ
	 */
	static variable(varIndex: number): MultiPoly {
		const p = new MultiPoly();
		const exp: Exponents = new Map([[varIndex, 1]]);
		p.terms.set(expToKey(exp), 1n);
		return p;
	}

	/**
	 * Create a zero polynomial
	 */
	static zero(): MultiPoly {
		return new MultiPoly();
	}

	/**
	 * Deep copy
	 */
	clone(): MultiPoly {
		return new MultiPoly(new Map(this.terms));
	}

	/**
	 * Get constant term (or 0 if none)
	 */
	constantTerm(): bigint {
		return this.terms.get('') ?? 0n;
	}

	/**
	 * Get the degree in a specific variable
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
	 * Get coefficient of a specific monomial
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
	 * Check if polynomial is a constant
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
	 * Check if polynomial is zero
	 */
	isZero(): boolean {
		return this.terms.size === 0;
	}

	/**
	 * Get leading coefficient with respect to variable varIndex
	 * (coefficient of highest power of that variable, which is itself a polynomial)
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
	 * Set coefficient of a specific monomial
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
	 * Convert to string representation
	 */
	text(varNames: string[]): string {
		if (this.terms.size === 0) {
			return '0';
		}

		const names = varNames;
		const termStrs: string[] = [];

		// Sort terms for consistent output
		const sortedKeys = Array.from(this.terms.keys()).sort(compareKeyTotalDegDescThenLex);

		for (const key of sortedKeys) {
			const coeff = this.terms.get(key)!;
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
	 * Get the total degree (sum of all exponents in the leading monomial)
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
	 * Remove any zero-coefficient terms (safety cleanup).
	 */
	trim(): void {
		for (const [k, c] of this.terms.entries()) {
			if (c === 0n) {
				this.terms.delete(k);
			}
		}
	}

	/**
	 * Get all variables that appear in this polynomial
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
// NOTE: These helpers are intentionally suffixed with `Impl`.
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
