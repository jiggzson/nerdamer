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
	factor,
	gcd,
	lcm,
	partfrac,
	simplify,
} from '../../src/api/algebra';
import { C, S, diff, integrate, limit } from '../../src/api/calculus';
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
	MultiPoly,
	groebnerBasisWithOptions,
} from '../../src/api/advanced';

const EXPECTED_PACKAGE_EXPORTS = [
	'.',
	'./core',
	'./algebra',
	'./calculus',
	'./solve',
	'./structures',
	'./assumptions',
	'./parser',
	'./advanced',
	'./debug',
	'./docs-data/parser-functions.json',
	'./dist/bundle.js',
	'./dist/parser.js',
	'./package.json',
] as const;

describe('public package surface', () => {
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
		expect(buildFunction('x+1')(2)).toBe(3);
		expect(new AssignmentError()).toBeInstanceOf(Error);
	});

	it('exports the algebra and calculus domain entry points', () => {
		expect(Polynomial).toBe(nerdamer.classes.Polynomial);
		expect(Term).toBeDefined();
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
		expect(MultiPoly).toBeDefined();
		expect(groebnerBasisWithOptions).toBeDefined();
	});
});
