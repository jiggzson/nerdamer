import '../helpers/registerNerdamerFunctions';
import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import {
	equal,
	numericParts,
	partsDistinct,
} from '../../src/core/classes/parser/operations/compare/index';
import { SymbolicSolver } from '../../src/solve/classes/SymbolicSolver';

/** Whether the numeric check alone rules out equality of two expressions. */
function disproved(a: string, b: string): boolean {
	const first = numericParts(Expression.create(a));
	const second = numericParts(Expression.create(b));
	return first !== undefined && second !== undefined && partsDistinct(first, second);
}

describe('Numeric disproof in equal', () => {
	afterEach(() => clearAssumptions());

	it('tells distinct Cardano roots apart without the symbolic proof', () => {
		const roots = SymbolicSolver.cubic(['1', '1', '0', '1'].map(c => Expression.create(c)));
		for (let i = 0; i < roots.length; i++) {
			for (let j = 0; j < roots.length; j++) {
				const first = numericParts(roots[i]);
				const second = numericParts(roots[j]);
				expect(first && second && partsDistinct(first, second)).toBe(i !== j);
				expect(equal(roots[i], roots[j])).toBe(i === j);
			}
		}
	});

	it.each([
		// Cancellation of huge terms leaves rounding noise that changes with the precision.
		['(10^30+sqrt(2))^2-10^60-2*10^30*sqrt(2)', '2'],
		['(10^30+sqrt(2))*(10^30-sqrt(2))-10^60', '-2'],
		// The lower precision rounds this 5e-21 to 0, so the two precisions disagree.
		['(10^40+1)^(1/2)-10^20', '0'],
		['sqrt(2)+sqrt(3)', 'sqrt(5+2*sqrt(6))'],
		['cbrt(2)', '2^(1/3)'],
		// Values that differ within rounding are left to the exact comparison.
		['sqrt(2)', '1.4142135623730950488'],
	])('never rules out %s = %s numerically', (a, b) => {
		expect(disproved(a, b)).toBe(false);
	});

	it.each([
		['pi', '355/113'],
		['e^pi', 'pi^e'],
		['1+i', '1-i'],
	])('rules out %s = %s', (a, b) => {
		expect(disproved(a, b)).toBe(true);
		expect(equal(a, b)).toBe(false);
	});

	it('keeps proving equality symbolically', () => {
		expect(equal('sqrt(8)', '2*sqrt(2)')).toBe(true);
		expect(equal('(1+i)^2', '2*i')).toBe(true);
		expect(equal('sin(10^25+1)-sin(10^25)', 'sin(10^25+1)-sin(10^25)')).toBe(true);
	});

	it('leaves expressions with variables to the symbolic comparison', () => {
		expect(numericParts(Expression.create('x+1'))).toBeUndefined();
		assume('x>0');
		expect(equal('x', 'x')).toBe(true);
	});
});
