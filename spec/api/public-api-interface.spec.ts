import nerdamer from '../../src';
import * as advancedApi from '../../src/api/advanced';
import * as algebraApi from '../../src/api/algebra';
import * as assumptionsApi from '../../src/api/assumptions';
import * as calculusApi from '../../src/api/calculus';
import * as coreApi from '../../src/api/core';
import * as debugApi from '../../src/api/debug';
import * as parserApi from '../../src/api/parser';
import * as solveApi from '../../src/api/solve';
import * as specialApi from '../../src/api/special';
import * as statisticsApi from '../../src/api/statistics';
import * as structuresApi from '../../src/api/structures';

const ROOT_API_PROPERTIES = [
	'C',
	'Chi',
	'Ci',
	'Ei',
	'Li',
	'S',
	'Shi',
	'Si',
	'abs',
	'acos',
	'acosh',
	'acot',
	'acoth',
	'acsc',
	'acsch',
	'aliasOperator',
	'arccos',
	'arcsin',
	'arctan',
	'arg',
	'asec',
	'asech',
	'asin',
	'asinh',
	'assume',
	'atan',
	'atan2',
	'atanh',
	'buildFunction',
	'cbrt',
	'ceil',
	'classes',
	'clearFunctions',
	'clearVars',
	'clearWarnings',
	'coeffs',
	'completeSquare',
	'conjugate',
	'connect',
	'constants',
	'contains',
	'content',
	'continued_fraction',
	'convertFromLaTeX',
	'convertToLaTeX',
	'convertToTeX',
	'cos',
	'cosh',
	'cot',
	'coth',
	'cross',
	'csc',
	'csch',
	'csgn',
	'defint',
	'deg',
	'degrees',
	'delta',
	'determinant',
	'dfact',
	'dfactorial',
	'diff',
	'div',
	'divide',
	'dot',
	'erf',
	'erfc',
	'errors',
	'exp',
	'expand',
	'fact',
	'factor',
	'factorial',
	'fib',
	'floor',
	'functions',
	'gamma',
	'gamma_incomplete',
	'gamma_incomplete_lower',
	'gcd',
	'get',
	'getAssumptions',
	'getConstant',
	'getOperator',
	'getVars',
	'getWarnings',
	'groebner',
	'heaviside',
	'hypot',
	'ilaplace',
	'ilt',
	'imagpart',
	'imatrix',
	'integrate',
	'invert',
	'isPrime',
	'isReserved',
	'laplace',
	'lcm',
	'limit',
	'line',
	'log',
	'log10',
	'matrix',
	'max',
	'mean',
	'median',
	'min',
	'mod',
	'modInv',
	'mode',
	'nthroot',
	'nullspace',
	'numeric',
	'parens',
	'partfrac',
	'pfactor',
	'pfactord',
	'polarform',
	'polyFactors',
	'pretty',
	'product',
	'radians',
	'realpart',
	'rect',
	'rectform',
	'roots',
	'round',
	'scientific',
	'sec',
	'sech',
	'set',
	'setConsoleWarnings',
	'setConstant',
	'setFunction',
	'setOperator',
	'setVar',
	'setWarningHandler',
	'sign',
	'significant',
	'simplify',
	'sin',
	'sinc',
	'sinh',
	'smpstdev',
	'smpvar',
	'solve',
	'solveSystem',
	'solveeqs',
	'sqrt',
	'stdev',
	'step',
	'subst',
	'sum',
	'symbols',
	'tan',
	'tanh',
	'tri',
	'trunc',
	'uSub',
	'uUnSub',
	'updateAPI',
	'variance',
	'version',
	'zscore',
] as const;

const ROOT_CLASS_PROPERTIES = [
	'Assumption',
	'Collection',
	'Converter',
	'Dictionary',
	'Equation',
	'Expression',
	'Matrix',
	'Polynomial',
	'Rational',
	'SolutionSet',
	'ValuesSet',
	'Vector',
	'instance',
] as const;

const PUBLIC_ERROR_CONSTRUCTORS = [
	'AssignmentError',
	'DimensionError',
	'DivisionByZeroError',
	'MathError',
	'MissingReferenceError',
	'NaNError',
	'NotImplementedError',
	'OperatorError',
	'ParserError',
	'ParserSyntaxError',
	'PolynomialError',
	'UndefinedError',
	'UnexpectedDataType',
	'UnexpectedInputError',
	'UnexpectedTokenError',
	'UnsupportedOperationError',
	'ZeroToZeroPowerError',
] as const;

describe('public API interface', () => {
	it('locks the callable root compatibility interface', () => {
		expect(Object.keys(nerdamer).sort()).toEqual(ROOT_API_PROPERTIES);
		expect(Object.keys(nerdamer.classes).sort()).toEqual(ROOT_CLASS_PROPERTIES);
		expect(Object.keys(nerdamer.classes.instance).sort()).toEqual(['Parser']);

		for (const name of PUBLIC_ERROR_CONSTRUCTORS) {
			expect(nerdamer.errors[name]).toBe(coreApi[name]);
		}
	});

	it('locks the core runtime exports', () => {
		expect(Object.keys(coreApi).sort()).toEqual([
			'AssignmentError',
			'CoeffObject',
			'Converter',
			'DimensionError',
			'DivisionByZeroError',
			'Equation',
			'Expression',
			'MathError',
			'MissingReferenceError',
			'NaNError',
			'NotImplementedError',
			'OperatorError',
			'ParserError',
			'ParserSyntaxError',
			'PolynomialError',
			'Rational',
			'UndefinedError',
			'UnexpectedDataType',
			'UnexpectedInputError',
			'UnexpectedTokenError',
			'UnsupportedOperationError',
			'ZeroToZeroPowerError',
			'buildFunction',
			'connectFunctions',
			'symbols',
		]);
	});

	it('locks the algebra runtime exports', () => {
		expect(Object.keys(algebraApi).sort()).toEqual([
			'CoeffObject',
			'Polynomial',
			'Term',
			'coeffs',
			'completeSquare',
			'content',
			'deg',
			'factor',
			'gcd',
			'groebner',
			'isPrime',
			'lcm',
			'partfrac',
			'pfactor',
			'pfactord',
			'polyFactors',
			'simplify',
			'uSub',
			'uUnSub',
		]);
	});

	it('locks the calculus runtime exports', () => {
		expect(Object.keys(calculusApi).sort()).toEqual([
			'C',
			'S',
			'defint',
			'diff',
			'ilaplace',
			'integrate',
			'laplace',
			'limit',
			'product',
			'sum',
		]);
	});

	it('locks the solve runtime exports', () => {
		expect(Object.keys(solveApi).sort()).toEqual([
			'MultivariateSolver',
			'PolynomialSolver',
			'SolutionSet',
			'SymbolicSolver',
			'roots',
			'solve',
			'solveSystem',
		]);
	});

	it('locks the special-function runtime exports', () => {
		expect(Object.keys(specialApi).sort()).toEqual([
		'Chi',
		'Ci',
		'Ei',
		'Li',
		'Shi',
		'Si',
		'erf',
		'erfc',
		'gamma',
		'gammaIncomplete',
		'gammaIncompleteLower',
		'sinc',
	]);
	});

	it('locks the statistics runtime exports', () => {
		expect(Object.keys(statisticsApi).sort()).toEqual([
		'mean',
		'median',
		'mode',
		'sampleStandardDeviation',
		'sampleVariance',
		'smpstdev',
		'smpvar',
		'stdev',
		'variance',
		'zscore',
	]);
	});

	it('locks the structures runtime exports', () => {
		expect(Object.keys(structuresApi).sort()).toEqual([
			'Collection',
			'Dictionary',
			'Matrix',
			'ValuesSet',
			'Vector',
			'cross',
			'determinant',
			'dot',
			'imatrix',
			'invert',
			'nullspace',
		]);
	});

	it('locks the assumptions runtime exports', () => {
		expect(Object.keys(assumptionsApi).sort()).toEqual([
			'Assumption',
			'assume',
			'clearAssumptions',
			'forgetAssumptionFor',
			'getAssumptionFor',
			'getAssumptions',
		]);
	});

	it('locks the parser runtime exports', () => {
		expect(Object.keys(parserApi).sort()).toEqual(['Parser']);
	});

	it('locks the advanced runtime exports', () => {
		expect(Object.keys(advancedApi).sort()).toEqual([
			'Complex',
			'FunctionSolver',
			'Groebner',
			'GroebnerBudgetExceeded',
			'SparsePolynomial',
			'eliminate',
			'groebnerBasisWithOptions',
			'idealMembership',
			'reduceByBasis',
			'solveRationalSystem',
		]);
	});

	it('locks the debug runtime exports', () => {
		expect(Object.keys(debugApi).sort()).toEqual([
			'inspectEntity',
			'inspectExpression',
			'inspectParse',
			'inspectPolynomial',
			'inspectTerm',
		]);
	});
});
