import packageInfo from '../../package.json';
import nerdamer from '../../src';
import {
	AssignmentError,
	Equation,
	Expression,
	Rational,
	buildFunction,
} from '../../src/api/core';
import {
	Polynomial,
	Term,
	completeSquare,
	factor,
	gcd,
	lcm,
	partfrac,
	simplify,
} from '../../src/api/algebra';
import { C, S, diff, integrate, limit } from '../../src/api/calculus';
import { TRIG, INVERSE_TRIG, HYPERBOLIC_TRIG, INVERSE_HYPERBOLIC_TRIG } from '../../src/api/constants';
import { gamma, erf, Si } from '../../src/api/special';
import { mean, median, variance } from '../../src/api/statistics';
import { inspectParse } from '../../src/api/debug';
import { Parser } from '../../src/api/parser';
import {
	MultivariateSolver,
	PolynomialSolver,
	SolutionSet,
	SymbolicSolver,
	solveSystem,
} from '../../src/api/solve';
import { Collection, Dictionary, Matrix, ValuesSet, Vector } from '../../src/api/structures';
import {
	Assumption,
	assume,
	clearAssumptions,
} from '../../src/api/assumptions';
import {
	Complex,
	FunctionSolver,
	SparsePolynomial,
	groebnerBasisWithOptions,
} from '../../src/api/advanced';

const EXPECTED_PACKAGE_EXPORTS = [
	'.',
	'./core',
	'./constants',
	'./algebra',
	'./calculus',
	'./solve',
	'./structures',
	'./assumptions',
	'./parser',
	'./advanced',
	'./debug',
	'./docs-data/parser-functions.json',
	'./docs-data/typedoc.json',
	'./dist/bundle.js',
	'./package.json',
	'./special',
	'./statistics',
] as const;

describe('public package interface', () => {
	it('declares the intentional package export map', () => {
		expect(Object.keys(packageInfo.exports)).toEqual(EXPECTED_PACKAGE_EXPORTS);
	});

	it('keeps the compatibility root callable while exposing aligned aliases', () => {
		expect(nerdamer.factor).toBe(factor);
		expect(nerdamer.simplify).toBe(simplify);
		expect(nerdamer.solveSystem).toBe(solveSystem);
		expect(nerdamer.solveeqs).toBe(solveSystem);
		expect(nerdamer.classes.Equation).toBe(Equation);
		expect(nerdamer.classes.instance.Parser).toBe(Parser);
	});

	it('exports the core object model and supported errors', () => {
		expect(Expression.create('x+1')).toBeInstanceOf(Expression);
		expect(Equation).toBe(nerdamer.classes.Equation);
		expect(Rational.create('3/4')).toBeInstanceOf(Rational);
		expect(buildFunction).toBe(nerdamer.buildFunction);
		expect(buildFunction('x+1')(2)).toBe(3);
		expect(new AssignmentError()).toBeInstanceOf(Error);
	});

	it('exports the algebra and calculus domain entry points', () => {
		expect(Polynomial).toBe(nerdamer.classes.Polynomial);
		expect(Term).toBeDefined();
		expect(completeSquare).toBe(nerdamer.completeSquare);
		expect(factor).toBe(nerdamer.factor);
		expect(simplify).toBe(nerdamer.simplify);
		expect(gcd).toBeDefined();
		expect(lcm).toBeDefined();
		expect(partfrac).toBeDefined();
		expect(diff).toBe(nerdamer.diff);
		expect(integrate).toBe(nerdamer.integrate);
		expect(limit).toBe(nerdamer.limit);
		expect(S).toBe(nerdamer.S);
		expect(C).toBe(nerdamer.C);
	});

	it('publishes immutable function-name categories without exposing parser internals', () => {
		expect(TRIG).toEqual(['cos', 'sin', 'tan', 'sec', 'csc', 'cot']);
		expect(INVERSE_TRIG).toContain('asin');
		expect(HYPERBOLIC_TRIG).toContain('sinh');
		expect(INVERSE_HYPERBOLIC_TRIG).toContain('asinh');
		for (const category of [TRIG, INVERSE_TRIG, HYPERBOLIC_TRIG, INVERSE_HYPERBOLIC_TRIG]) {
			expect(Object.isFrozen(category)).toBe(true);
		}
		expect(Expression.create('sin(x)').isFunction(TRIG)).toBe(true);
		expect(Expression.create('asin(x)').isFunction(INVERSE_TRIG)).toBe(true);
		expect(Expression.create('sinh(x)').isFunction(HYPERBOLIC_TRIG)).toBe(true);
		expect(Expression.create('asinh(x)').isFunction(INVERSE_HYPERBOLIC_TRIG)).toBe(true);
		expect(Expression.create('sin(x)').isFunction(INVERSE_TRIG)).toBe(false);
		// A variable with an incidental name property is not a function node.
		const nonFunction = Object.assign(Expression.Variable('x'), { name: 'sin' });
		expect(nonFunction.isFunction('sin')).toBe(false);
		expect(nonFunction.isFunction(TRIG)).toBe(false);
	});

	it('exports special and statistics domain entry points', () => {
		expect(gamma).toBe(nerdamer.gamma);
		expect(erf).toBe(nerdamer.erf);
		expect(Si).toBe(nerdamer.Si);
		expect(mean).toBe(nerdamer.mean);
		expect(median).toBe(nerdamer.median);
		expect(variance).toBe(nerdamer.variance);
	});

	it('exports supported structures, solvers, assumptions, parser, debug, and advanced APIs', () => {
		expect(Matrix).toBe(nerdamer.classes.Matrix);
		expect(Vector).toBe(nerdamer.classes.Vector);
		expect(Collection).toBe(nerdamer.classes.Collection);
		expect(Dictionary).toBe(nerdamer.classes.Dictionary);
		expect(ValuesSet).toBe(nerdamer.classes.ValuesSet);
		expect(SolutionSet).toBe(nerdamer.classes.SolutionSet);
		expect(PolynomialSolver).toBeDefined();
		expect(MultivariateSolver).toBeDefined();
		expect(SymbolicSolver).toBeDefined();
		expect(Parser.parse('x+1').text()).toEqual('1+x');
		expect(Parser.get('INDEX_BASE')).toBe(nerdamer.get('INDEX_BASE'));
		expect(inspectParse('x+1').result.text).toEqual('1+x');

		clearAssumptions();
		expect(assume('x>0')).toBeInstanceOf(Assumption);
		clearAssumptions();

		expect(Complex).toBeDefined();
		expect(FunctionSolver).toBeDefined();
		expect(SparsePolynomial).toBeDefined();
		expect(groebnerBasisWithOptions).toBeDefined();
	});
});