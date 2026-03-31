import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { message, UnsupportedOperationError } from '../../src/core/errors';
import { solveSystem } from '../../src/solve/solveSystem';

beforeEach(() => {
	for (const key of Object.keys(Parser.KNOWN_VALUES)) {
		delete Parser.KNOWN_VALUES[key];
	}
});

describe('solveSystem', () => {
	// ─── Trivial / edge cases ───────────────────────────────────────
	it('returns a vector with an empty dictionary for an empty system', () => {
		const result = solveSystem([]);
		expect(result.text()).toEqual(new Vector([new Dictionary()]).text());
	});

	it('solves a unique linear system', () => {
		const result = solveSystem(['x+y-3', '2*x+3*y-8']);
		expect(result.text()).toEqual(new Vector([Parser.parse('{x => 1, y => 2}')]).text());
	});

	it('accepts vector input for a unique linear system', () => {
		const equations = new Vector(['x+y-3', '2*x+3*y-8']);
		const result = solveSystem(equations);
		expect(result.text()).toEqual(new Vector([Parser.parse('{x => 1, y => 2}')]).text());
	});

	it('returns an empty vector for an inconsistent linear system', () => {
		const result = solveSystem(['x+y-1', 'x+y-2']);
		expect(result.text()).toEqual(new Vector([]).text());
	});

	// ─── Nonlinear: rational solutions ──────────────────────────────
	it('solves a nonlinear system with rational solutions', () => {
		const result = solveSystem(['x^2-1', 'y-x']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual(['{x => -1, y => -1}', '{x => 1, y => 1}']);
	});

	it('solves a symmetric system', () => {
		const result = solveSystem(['x+y-5', 'x*y-6']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual(['{x => 2, y => 3}', '{x => 3, y => 2}']);
	});

	it('solves a parabola-line intersection', () => {
		const result = solveSystem(['y-x^2', 'y-x-2']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual(['{x => -1, y => 1}', '{x => 2, y => 4}']);
	});

	it('solves an ellipse-line intersection', () => {
		const result = solveSystem(['x^2+4*y^2-4', 'x+2*y-2']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual(['{x => 0, y => 1}', '{x => 2, y => 0}']);
	});

	it('solves a tangent circle-line intersection', () => {
		const result = solveSystem(['x^2+y^2-1', 'y-1']);
		expect(result.count()).toEqual(1);
		expect(result.at(0).text()).toEqual('{x => 0, y => 1}');
	});

	// ─── Nonlinear: irrational solutions ────────────────────────────
	it('solves a nonlinear system with irrational solutions', () => {
		const result = solveSystem(['x^2-2', 'y-x']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual(['{x => -2^(1/2), y => -2^(1/2)}', '{x => 2^(1/2), y => 2^(1/2)}']);
	});

	it('solves a circle-line intersection with irrational solutions', () => {
		const result = solveSystem(['x^2+y^2-1', 'y-x']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual([
			'{x => (-1/2)*2^(1/2), y => (-1/2)*2^(1/2)}',
			'{x => (1/2)*2^(1/2), y => (1/2)*2^(1/2)}',
		]);
	});

	it('solves a circle-circle intersection', () => {
		const result = solveSystem(['x^2+y^2-1', '(x-1)^2+y^2-1']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0).text(), result.at(1).text()].sort();
		expect(texts).toEqual([
			'{x => 1/2, y => (-1/2)*3^(1/2)}',
			'{x => 1/2, y => (1/2)*3^(1/2)}',
		]);
	});

	// ─── Nonlinear: cubic ───────────────────────────────────────────
	it('solves a cubic-linear system', () => {
		const result = solveSystem(['x^3-y', 'y-x-1']);
		expect(result.count()).toEqual(3);
	});

	// ─── Nonlinear: parabola-parabola ───────────────────────────────
	it('solves a parabola-parabola intersection', () => {
		const result = solveSystem(['y-x^2', 'x-y^2']);
		expect(result.count()).toEqual(4);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toContain('{x => 0, y => 0}');
		expect(texts).toContain('{x => 1, y => 1}');
	});

	it('throws for nonlinear systems with infinitely many solutions in v1', () => {
		expect(() => solveSystem(['x*y'])).toThrow(UnsupportedOperationError);
		expect(() => solveSystem(['x*y'])).toThrow(message('solveSystemInfiniteSolutions'));
	});

	it('solves a nonlinear non-polynomial system numerically', () => {
		const result = solveSystem(['sin(x)', 'y-1']);
		expect(result.text()).toEqual(
			Parser.parse(
				'[{x => -9.4247779607686356079, y => 1}, {x => 0, y => 1}, {x => 9.4247779607693797154, y => 1}]'
			).text()
		);
	});

	it('solves a mixed trig-polynomial system numerically', () => {
		const result = solveSystem(['cos(x)^2-y-1', 'x^2+y-7']);
		expect(result.count()).toBeGreaterThanOrEqual(2);
	});

	it('solves a mixed trig-polynomial system numerically', () => {
		const result = solveSystem(['cos(x)^2-y-1', 'x^2+y-7']);
		expect(result.text()).toEqual(
			Parser.parse(
				'[{x => -2.6825912868253889607, y => -0.19629601215149626377}, {x => 2.6825912868253889607, y => -0.19629601215149626377}]'
			).text()
		);
	});

	it('solves a linear trivariate system', () => {
		const result = solveSystem(['x+y+z-6', 'x-y+z-2', '2*x+y-z-1']);
		expect(result.count()).toEqual(1);
		expect(result.at(0).text()).toEqual('{x => 1, y => 2, z => 3}');
	});

	it('solves a nonlinear trivariate system', () => {
		const result = solveSystem(['x*y*z-6', 'x+y+z-6', 'x^2+y^2+z^2-14']);
		expect(result.count()).toEqual(6);
	});

	it('solves a symmetric cubic trivariate system', () => {
		const result = solveSystem(['x+y+z-1', 'x^2+y^2+z^2-1', 'x^3+y^3+z^3-1']);
		expect(result.count()).toEqual(3);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toEqual([
			'{x => 0, y => 0, z => 1}',
			'{x => 0, y => 1, z => 0}',
			'{x => 1, y => 0, z => 0}',
		]);
	});

	// ─── Higher degree bivariate ────────────────────────────────────
	it('solves a quartic-quadratic system', () => {
		const result = solveSystem(['x^4-y', 'x^2+y-2']);
		expect(result.count()).toEqual(4);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toContain('{x => 1, y => 1}');
		expect(texts).toContain('{x => -1, y => 1}');
	});

	it('solves a biquadratic system', () => {
		const result = solveSystem(['x^2+y^2-2', 'x^2*y^2-1']);
		expect(result.count()).toEqual(4);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toEqual([
			'{x => -1, y => -1}',
			'{x => -1, y => 1}',
			'{x => 1, y => -1}',
			'{x => 1, y => 1}',
		]);
	});

	it('solves an underdetermined linear system with free variables', () => {
		const result = solveSystem(['x+y-1']);
		expect(result.count()).toEqual(1);
		expect(result.at(0).text()).toEqual('{x => 1-y, y => y}');
	});

	it('solves an underdetermined linear system with two free variables', () => {
		const result = solveSystem(['x+y+z-6']);
		expect(result.count()).toEqual(1);
		expect(result.at(0).text()).toEqual('{x => 6-y-z, y => y, z => z}');
	});

	it('solves an underdetermined trivariate linear system', () => {
		const result = solveSystem(['x+y+z-6', 'x-y-2']);
		expect(result.count()).toEqual(1);
		expect(result.at(0).text()).toEqual('{x => 4+(-1/2)*z, y => 2+(-1/2)*z, z => z}');
	});
});
