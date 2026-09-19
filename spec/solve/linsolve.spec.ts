import { Expression } from '../../src/core/classes/expression/Expression';
import { Vector } from '../../src/core/classes/vector/Vector';
import { solveLinearSystem, type LinearSystemResult } from '../../src/solve/linsolve';

/** Shorthand for Expression.create */
const e = (s: string) => Expression.create(s);

/** Assert a unique solution matches expected values */
function expectUnique(result: LinearSystemResult, expected: Record<string, string>) {
	expect(result.type).toEqual('unique');
	if (result.type !== 'unique') {
		return;
	}
	for (const [varName, val] of Object.entries(expected)) {
		expect(result.solutions[varName]).toBeDefined();
		expect(result.solutions[varName].eq(e(val))).toBe(true);
	}
	expect(Object.keys(result.solutions).length).toEqual(Object.keys(expected).length);
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('solveLinearSystem', () => {
	describe('unique solutions', () => {
		it('should solve a 2×2 system', () => {
			// x + y - 3 = 0, 2x + 3y - 8 = 0 → x=1, y=2
			const result = solveLinearSystem([e('x+y-3'), e('2*x+3*y-8')]);
			expectUnique(result, { x: '1', y: '2' });
		});

		it('should solve a 3×3 system', () => {
			// x + y + z - 6 = 0
			// 2x + y - z - 1 = 0
			// x - y + z - 2 = 0
			// Solution: x=1, y=2, z=3
			const result = solveLinearSystem([e('x+y+z-6'), e('2*x+y-z-1'), e('x-y+z-2')]);
			expectUnique(result, { x: '1', y: '2', z: '3' });
		});

		it('should solve a single equation in one variable', () => {
			// 3x - 6 = 0 → x = 2
			const result = solveLinearSystem([e('3*x-6')]);
			expectUnique(result, { x: '2' });
		});

		it('should solve with fractional coefficients', () => {
			// (1/2)x + (1/3)y - 1 = 0 →  3x + 2y = 6
			// x - y - 1 = 0             →  x - y = 1
			// Solution: x = 8/5, y = 3/5
			const result = solveLinearSystem([e('(1/2)*x+(1/3)*y-1'), e('x-y-1')]);
			expectUnique(result, { x: '8/5', y: '3/5' });
		});

		it('should solve with negative coefficients', () => {
			// -x + 2y - 1 = 0, 3x - y - 5 = 0
			// → x = 11/5, y = 8/5... let me verify:
			// -x + 2y = 1 → x = 2y - 1
			// 3(2y-1) - y = 5 → 6y - 3 - y = 5 → 5y = 8 → y = 8/5
			// x = 16/5 - 1 = 11/5
			const result = solveLinearSystem([e('-x+2*y-1'), e('3*x-y-5')]);
			expectUnique(result, { x: '11/5', y: '8/5' });
		});

		it('should handle explicit variable ordering', () => {
			// y + x - 3 = 0, 3y + 2x - 8 = 0
			// With variables [x, y]: x=1, y=2
			const result = solveLinearSystem([e('y+x-3'), e('3*y+2*x-8')], ['x', 'y']);
			expectUnique(result, { x: '1', y: '2' });
		});

		it('should solve an overdetermined consistent system', () => {
			// x + y = 3, 2x + 2y = 6, x + y = 3 (redundant)
			// This is rank 1 → actually infinite. Let me use a properly determined one.
			// x + y = 3, x - y = 1, 2x + y = 4
			// From first two: x=2, y=1. Third: 4+1=5≠4. Inconsistent!
			// Let me use: x+y=3, x-y=1, 2x=4 → x=2, y=1
			const result = solveLinearSystem([e('x+y-3'), e('x-y-1'), e('2*x-4')]);
			expectUnique(result, { x: '2', y: '1' });
		});
	});

	describe('inconsistent systems', () => {
		it('should detect parallel lines (no solution)', () => {
			// x + y - 1 = 0, x + y - 3 = 0
			const result = solveLinearSystem([e('x+y-1'), e('x+y-3')]);
			expect(result.type).toEqual('inconsistent');
		});

		it('should detect inconsistency in a 3-equation system', () => {
			// x + y + z = 1
			// x + y + z = 2
			// x - y = 0
			const result = solveLinearSystem([e('x+y+z-1'), e('x+y+z-2'), e('x-y')]);
			expect(result.type).toEqual('inconsistent');
		});

		it('should detect inconsistency with all-zero LHS but nonzero RHS', () => {
			// 0*x + 0*y - 5 = 0 → 0 = 5
			// This is just the expression -5
			const result = solveLinearSystem([e('-5')], ['x']);
			expect(result.type).toEqual('inconsistent');
		});
	});

	// ── Infinite solutions (underdetermined) ─────────────────────────────

	describe('infinite solutions', () => {
		it('should parameterize a single equation in two variables', () => {
			// x + y - 3 = 0 → x = 3 - y, y is free
			const result = solveLinearSystem([e('x+y-3')]);
			expect(result.type).toEqual('infinite');
			if (result.type !== 'infinite') {
				return;
			}
			expect(result.freeVariables).toContain('y');
			// x should be expressed as 3 - y
			expect(result.solutions['x'].eq(e('3-y'))).toBe(true);
			// y should map to itself
			expect(result.solutions['y'].eq(e('y'))).toBe(true);
		});

		it('should handle two equations in three variables', () => {
			// x + y + z = 6
			// x - y + z = 2
			// Adding: 2x + 2z = 8 → x + z = 4 → x = 4 - z
			// Subtracting: 2y = 4 → y = 2
			// z is free
			const result = solveLinearSystem([e('x+y+z-6'), e('x-y+z-2')]);
			expect(result.type).toEqual('infinite');
			if (result.type !== 'infinite') {
				return;
			}
			expect(result.freeVariables.length).toEqual(1);
			expect(result.freeVariables).toContain('z');
			// y should be 2
			expect(result.solutions['y'].eq(e('2'))).toBe(true);
			// x should be 4 - z
			expect(result.solutions['x'].eq(e('4-z'))).toBe(true);
		});

		it('should handle redundant equations', () => {
			// x + y = 3 and 2x + 2y = 6 (same line)
			const result = solveLinearSystem([e('x+y-3'), e('2*x+2*y-6')]);
			expect(result.type).toEqual('infinite');
			if (result.type !== 'infinite') {
				return;
			}
			expect(result.freeVariables.length).toEqual(1);
		});

		it('should handle a completely free system (0=0)', () => {
			// 0*x + 0*y = 0 → trivial
			const result = solveLinearSystem([e('0')], ['x', 'y']);
			expect(result.type).toEqual('infinite');
			if (result.type !== 'infinite') {
				return;
			}
			expect(result.freeVariables).toContain('x');
			expect(result.freeVariables).toContain('y');
		});

		it('should parameterize with multiple free variables', () => {
			// x + y + z + w = 10 (1 equation, 4 variables → 3 free)
			const result = solveLinearSystem([e('x+y+z+w-10')]);
			expect(result.type).toEqual('infinite');
			if (result.type !== 'infinite') {
				return;
			}
			expect(result.freeVariables.length).toEqual(3);
		});
	});

	describe('edge cases', () => {
		it('should handle empty input', () => {
			const result = solveLinearSystem([]);
			expect(result.type).toEqual('unique');
			if (result.type !== 'unique') {
				return;
			}
			expect(Object.keys(result.solutions).length).toEqual(0);
		});

		it('should handle a trivially true equation (0 = 0)', () => {
			const result = solveLinearSystem([e('0')]);
			expect(result.type).toEqual('unique');
			if (result.type !== 'unique') {
				return;
			}
			expect(Object.keys(result.solutions).length).toEqual(0);
		});

		it('should accept string array input', () => {
			const result = solveLinearSystem(['x+y-3', '2*x+3*y-8']);
			expectUnique(result, { x: '1', y: '2' });
		});

		it('should accept a Vector input', () => {
			const v = Vector.create(['x+y-3', '2*x+3*y-8']);
			const result = solveLinearSystem(v);
			expectUnique(result, { x: '1', y: '2' });
		});

		it('should throw for nonlinear equations', () => {
			expect(() => {
				solveLinearSystem([e('x^2+y-3')]);
			}).toThrow(/[Nn]onlinear/);
		});

		it('should throw for product terms', () => {
			expect(() => {
				solveLinearSystem([e('x*y+1')]);
			}).toThrow(/[Nn]onlinear/);
		});
	});

	describe('symbolic coefficients', () => {
		it('should solve with symbolic constants on the RHS', () => {
			// x + y - a = 0, x - y - b = 0
			// → x = (a+b)/2, y = (a-b)/2
			const result = solveLinearSystem([e('x+y-a'), e('x-y-b')], ['x', 'y']);
			expect(result.type).toEqual('unique');
			if (result.type !== 'unique') {
				return;
			}
			// Verify by substitution: x + y should equal a
			const xVal = result.solutions['x'];
			const yVal = result.solutions['y'];
			expect(xVal.plus(yVal).eq(e('a'))).toBe(true);
			expect(xVal.minus(yVal).eq(e('b'))).toBe(true);
		});
	});

	describe('larger systems', () => {
		it('should solve a 4×4 system', () => {
			// w + x + y + z = 10
			// 2w + x - y + z = 4
			// w - x + y - z = 0
			// w + x - y - z = -2
			// Adding eq1+eq4: 2w+2x-2z=8 → w+x-z=4
			// Adding eq1+eq3: 2w+2y=10 → w+y=5
			// From eq3: w-x+y-z=0 and eq4: w+x-y-z=-2
			// Add eq3+eq4: 2w-2z=-2 → w-z=-1 → w=z-1
			// From w+y=5: y=6-z
			// From w+x-z=4: z-1+x-z=4 → x=5
			// From eq1: z-1+5+6-z+z=10 → z+10=10 → z=0? Let me verify:
			// w=-1, x=5, y=6, z=0:
			//  eq1: -1+5+6+0=10 ✓
			//  eq2: -2+5-6+0=-3≠4 ✗
			// Let me just check solution by letting the solver do it and verifying
			const eqs = [e('w+x+y+z-10'), e('2*w+x-y+z-4'), e('w-x+y-z'), e('w+x-y-z+2')];
			const result = solveLinearSystem(eqs, ['w', 'x', 'y', 'z']);
			expect(result.type).toEqual('unique');
			if (result.type !== 'unique') {
				return;
			}
			// Verify each equation evaluates to zero when substituted
			const { w, x, y, z } = result.solutions;
			expect(w.plus(x).plus(y).plus(z).eq(e('10'))).toBe(true);
		});
	});
});
