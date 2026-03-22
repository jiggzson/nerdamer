/* SEQ.ts – corrected & optimized */

type Big = bigint;

/* ---------- helpers ---------- */

function factorial(n: number): Big {
	let r = 1n;
	for (let i = 2; i <= n; i++) {
		r *= BigInt(i);
	}
	return r;
}

function binomial(n: number, k: number): Big {
	if (k < 0 || k > n) {
		return 0n;
	}
	k = Math.min(k, n - k);
	let r = 1n;
	for (let i = 1; i <= k; i++) {
		r = (r * BigInt(n - k + i)) / BigInt(i);
	}
	return r;
}

/* Precompute signed Stirling numbers of the first kind */
function stirlingTable(maxN: number): Big[][] {
	const S: Big[][] = Array.from({ length: maxN + 1 }, () => Array(maxN + 1).fill(0n));
	S[0][0] = 1n;
	for (let n = 1; n <= maxN; n++) {
		for (let k = 1; k <= n; k++) {
			S[n][k] = S[n - 1][k - 1] - BigInt(n - 1) * S[n - 1][k];
		}
	}
	return S;
}

/* ---------- main ---------- */

export class Sequence {
	private coefficients: Big[] | null = null;
	private maxPower: number;
	private seq: Big[];
	private startsAt: number;

	constructor(sequence: (number | bigint)[], opts?: { startsAt?: number; maxPower?: number }) {
		this.seq = sequence.map(v => BigInt(v));
		this.startsAt = opts?.startsAt ?? 0;
		this.maxPower = opts?.maxPower ?? 50;

		if (!Number.isInteger(this.startsAt)) {
			throw new Error('startsAt must be an integer');
		}
	}

	private differenceTable(): Big[][] {
		const table: Big[][] = [this.seq];
		while (table[table.length - 1].length > 1) {
			const prev = table[table.length - 1];
			const next: Big[] = [];
			for (let i = 1; i < prev.length; i++) {
				next.push(prev[i] - prev[i - 1]);
			}
			table.push(next);
		}
		return table;
	}

	analyze(): this {
		if (this.coefficients) {
			return this;
		}

		const table = this.differenceTable();
		let degree = -1;

		/* stop at FIRST constant row */
		for (let i = 0; i < table.length; i++) {
			const row = table[i];
			if (row.length >= 2 && row.every(v => v === row[0])) {
				degree = i;
				break;
			}
		}

		if (degree < 0 || degree > this.maxPower) {
			throw new Error('Sequence is not a polynomial or exceeds maxPower');
		}

		if (this.seq.length <= degree) {
			throw new Error('Insufficient data points for detected degree');
		}

		const s = BigInt(this.startsAt);
		const stirling = stirlingTable(degree);

		/* Newton basis coefficients */
		const tPoly: Big[] = [];
		for (let k = 0; k <= degree; k++) {
			tPoly[k] = table[k][0] / factorial(k);
		}

		/* precompute (-s)^n */
		const negSPowers: Big[] = Array(degree + 1).fill(1n);
		for (let i = 1; i <= degree; i++) {
			negSPowers[i] = negSPowers[i - 1] * -s;
		}

		/* convert to monomial basis (with proper shift) */
		const poly: Big[] = Array(degree + 1).fill(0n);

		for (let k = 0; k <= degree; k++) {
			for (let m = 0; m <= k; m++) {
				const sKm = stirling[k][m];
				if (sKm === 0n) {
					continue;
				}

				for (let j = 0; j <= m; j++) {
					poly[j] += tPoly[k] * sKm * binomial(m, j) * negSPowers[m - j];
				}
			}
		}

		this.coefficients = poly;
		return this;
	}

	toPolynomialString(): string {
		if (!this.coefficients) {
			this.analyze();
		}
		const coeffs = this.coefficients!;

		let out = '';
		for (let i = coeffs.length - 1; i >= 0; i--) {
			const c = coeffs[i];
			if (c === 0n) {
				continue;
			}

			const sign = c < 0n ? '-' : out ? '+' : '';
			const abs = c < 0n ? -c : c;

			out += sign;
			if (i === 0 || abs !== 1n) {
				out += abs.toString();
			}
			if (i >= 1) {
				out += 'x';
			}
			if (i >= 2) {
				out += '^' + i;
			}
		}
		return out || '0';
	}
}
