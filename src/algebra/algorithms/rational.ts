import { gcd } from './arith';

export type Rat = { n: bigint; d: bigint };

export function ratNorm(r: Rat): Rat {
	if (r.d === 0n) {
		throw new Error('Rat: division by zero');
	}
	if (r.n === 0n) {
		return { n: 0n, d: 1n };
	}
	let n = r.n;
	let d = r.d;
	if (d < 0n) {
		n = -n;
		d = -d;
	}
	const g0 = gcd(n, d);
	return { n: n / g0, d: d / g0 };
}

export function rat(n: bigint, d: bigint = 1n): Rat {
	return ratNorm({ n, d });
}

export function ratAdd(a: Rat, b: Rat): Rat {
	return ratNorm({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

export function ratSub(a: Rat, b: Rat): Rat {
	return ratNorm({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

export function ratMul(a: Rat, b: Rat): Rat {
	return ratNorm({ n: a.n * b.n, d: a.d * b.d });
}

export function ratDiv(a: Rat, b: Rat): Rat {
	if (b.n === 0n) {
		throw new Error('Rat: divide by zero');
	}
	return ratNorm({ n: a.n * b.d, d: a.d * b.n });
}

export function ratToInt(r: Rat): bigint | null {
	return r.d === 1n ? r.n : null;
}

export function uniAddRat(a: Rat[], b: Rat[]): Rat[] {
	const len = Math.max(a.length, b.length);
	const out: Rat[] = new Array(len).fill(0).map(() => rat(0n));
	for (let i = 0; i < len; i++) {
		out[i] = ratAdd(a[i] ?? rat(0n), b[i] ?? rat(0n));
	}
	while (out.length > 1 && out[out.length - 1].n === 0n) {
		out.pop();
	}
	return out;
}

export function uniMulRat(a: Rat[], b: Rat[]): Rat[] {
	const out: Rat[] = new Array(a.length + b.length - 1).fill(0).map(() => rat(0n));
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			out[i + j] = ratAdd(out[i + j], ratMul(a[i], b[j]));
		}
	}
	while (out.length > 1 && out[out.length - 1].n === 0n) {
		out.pop();
	}
	return out;
}

export function interpolateUnivariateRat(points: Array<{ x: bigint; y: Rat }>): Rat[] {
	if (points.length === 0) {
		return [rat(0n)];
	}

	const byX = new Map<bigint, Rat>();
	for (const p of points) {
		const prev = byX.get(p.x);
		if (!prev) {
			byX.set(p.x, p.y);
			continue;
		}
		if (ratSub(prev, p.y).n !== 0n) {
			throw new Error('interpolateUnivariateRat: duplicate x with conflicting y');
		}
	}
	const uniq = [...byX.entries()]
		.map(([x, y]) => ({ x, y }))
		.sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));

	const n = uniq.length;
	if (n === 1) {
		return [uniq[0].y];
	}

	let poly: Rat[] = [rat(0n)];
	for (let i = 0; i < n; i++) {
		let basis: Rat[] = [rat(1n)];
		let denom = rat(1n);
		for (let j = 0; j < n; j++) {
			if (j === i) {
				continue;
			}
			basis = uniMulRat(basis, [rat(-uniq[j].x), rat(1n)]);
			denom = ratMul(denom, rat(uniq[i].x - uniq[j].x));
		}
		const scale = ratDiv(uniq[i].y, denom);
		const scaled = basis.map(c => ratMul(c, scale));
		poly = uniAddRat(poly, scaled);
	}
	while (poly.length > 1 && poly[poly.length - 1].n === 0n) {
		poly.pop();
	}
	return poly;
}
