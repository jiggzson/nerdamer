import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('Original Cardano verification', () => {
	it('verifies all three symbolic roots without hanging', () => {
		// Exercise the pre-shortcut Cardano construction in a bounded child process.
		// The failure was caused by expanding the second root's verification residual.
		const script = `
require('./src/index');
const { Expression } = require('./src/core/classes/expression/Expression');
const { cbrt, sqrt } = require('./src/math/index');
const { SolutionSet } = require('./src/solve/classes/SolutionSet');

const [d, c, b, a] = ['-b', '0', '0', 'a'].map(value => Expression.create(value));
const zero = Expression.create(0);
const one = Expression.create(1);
const two = Expression.create(2);
const three = Expression.create(3);
const four = Expression.create(4);
const twentySeven = Expression.create(27);
const half = Expression.create('1/2');

const b1 = b.div(a);
const c1 = c.div(a);
const d1 = d.div(a);
const p = c1.minus(b1.pow(two).div(three));
const q = d1.minus(b1.times(c1).div(three)).plus(two.times(b1.pow(three)).div(twentySeven));
const discriminant = q.pow(two).div(four).plus(p.pow(three).div(twentySeven));
const shift = zero.minus(b1).div(three);
const sqrtDisc = sqrt(discriminant);
const negQOver2 = zero.minus(q).div(two);
const u = cbrt(negQOver2.plus(sqrtDisc));
const v = cbrt(negQOver2.minus(sqrtDisc));
const uPlusV = u.plus(v);
const uMinusV = u.minus(v);
const negHalf = zero.minus(half);
const imaginaryFactor = sqrt(three).div(two);
const imaginaryUnit = sqrt(zero.minus(one));
const roots = [
    uPlusV.plus(shift),
    negHalf.times(uPlusV).plus(imaginaryFactor.times(uMinusV).times(imaginaryUnit)).plus(shift),
    negHalf.times(uPlusV).minus(imaginaryFactor.times(uMinusV).times(imaginaryUnit)).plus(shift),
];

const solutions = new SolutionSet();
const factor = Expression.create('a*x^3-b');
for (const root of roots) {
    solutions.addSolution(root, factor, 'x');
}
if (solutions.count() !== 3) {
    throw new Error('Expected three accepted Cardano roots; got ' + solutions.count());
}
console.log('verified three original Cardano roots');
`;
		const result = spawnSync(process.execPath, ['-r', 'ts-node/register/transpile-only', '-e', script], {
			cwd: resolve(__dirname, '../..'),
			encoding: 'utf8',
			timeout: 12000,
		});

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('verified three original Cardano roots');
	}, 20000);
});
