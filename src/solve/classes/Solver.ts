import { diff as derivative } from '../../calculus/derivative/diff';
import { Expression } from '../../core/classes/expression/Expression';
import { diff } from '../../core/functions/numeric';

import type { ParserValuesObject } from '../../core/classes/parser/types';
import type { ExpressionInput } from '../../core/types';
import type Decimal from 'decimal.js';

export class Solver {
	// The numeric epsilon to be used
	epsilon = 1e-13;
	// The epsilon to be used when solving newton
	newtonEpsilon = Number.EPSILON * 2;
	// The maximum number of iteration for newton
	newtonMaxIterations = 200;
	newtonMaxSymbolicIterations = 50;
	// The maximum roots to search for at each side
	rootsPerSide = 10;
	// The extend to which roots will be searched for
	searchRadius = 100;
	// const f = (x) => { return x ** 3 + 2 * x ** 2 - 1 }; // Gives false positives
	symbolicEpsilon = 1e-16;

	getPoints(f: (x: number) => number, start = 0, step = 1) {
		const points: number[] = [];
		// Roots found. This should be reset for each side
		let roots = 0;
		const testAndAdd = (point: number) => {
			// Test if it's zero at that point
			if (f(point) === 0 || Math.sign(f(point - step)) !== Math.sign(f(point + step))) {
				points.push(point);
				roots++;
				return true;
			}
			return false;
		};

		const leftEnd = start - this.searchRadius;
		const rightEnd = start + this.searchRadius;

		// Test the right side
		let n = start;

		while (n < rightEnd) {
			testAndAdd(n);
			if (roots === this.rootsPerSide) {
				break;
			}
			n += step;
		}

		// Test the left side
		n = start;
		roots = 0;
		while (n > leftEnd) {
			testAndAdd(n);
			if (roots === this.rootsPerSide) {
				break;
			}
			n -= step;
		}

		return points;
	}

	newton(f: (x: number) => number, point: number) {
		let iters = 0;
		let x0 = point;
		const fp = diff(f);
		let x: number;
		let e: number;
		do {
			const fx0 = f(x0); //store the result of the function
			//if the value is zero then we're done because 0 - (0/d f(x0)) = 0
			if (x0 === 0 && fx0 === 0) {
				x = 0;
				break;
			}

			iters++;
			if (iters > this.newtonMaxIterations) {
				return;
			} //maximum iterations reached

			x = x0 - fx0 / fp(x0);
			e = Math.abs(x - x0);
			x0 = x;
		} while (e > this.newtonEpsilon);

		//check if the number is indeed zero. 1e-13 seems to give the most accurate results
		if (Math.abs(f(x)) <= this.epsilon) {
			return x;
		}
	}

	newtonSymbolic(f: Expression, p: Expression, variable: string) {
		let iters = 0;
		let x0 = p.getMultiplier().toDecimal();
		const fp = derivative(f, variable);
		const values: ParserValuesObject = { [variable]: p };
		let x: Decimal;
		let e: Decimal;
		do {
			const fx0 = f.evaluate(values);
			if (iters++ > this.newtonMaxSymbolicIterations) {
				return;
			} //maximum iterations reached

			x = x0.minus(fx0.div(fp.evaluate(values)).text({ decimal: true }));
			// tracker = tracker.minus(fx0S.div(Expression.create(fp, values)))
			e = x.minus(x0).abs();
			x0 = x;
			values[variable] = x0.isFinite() ? Expression.Number(x0) : x0.toString();
		} while (e.abs().gte(this.symbolicEpsilon));
		// console.log(tracker.toString())
		return x;
	}
	solve(f: ExpressionInput) {
		f = Expression.create(f);
		const g = f.buildFunction();
		const points = this.getPoints(g);
		const solutions: number[] = [];
		for (const p of points) {
			const solution = this.newton(g, p);
			if (solution !== undefined) {
				solutions.push(solution);
			}
		}

		return [...new Set(solutions)];
	}
	solveSymbolic(f: ExpressionInput) {
		f = Expression.create(f);
		const g = f.buildFunction();
		const points = this.getPoints(g);
		const variable = f.variables()[0];
		const solutions: { [key: string]: Decimal } = {};
		for (const p of points) {
			const solution = this.newtonSymbolic(f, Expression.Number(p), variable);
			if (solution !== undefined) {
				solutions[solution.toString()] = solution;
			}
		}

		return Object.values(solutions);
	}
}
