import nerdamer from '../../src/index';
import { Collection } from '../../src/core/classes/collection/Collection';
import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { Converter } from '../../src/core/converters/Converter';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';

describe('TeX conversion', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/683
	it('accepts explicit parentheses when converting expressions to TeX', () => {
		expect(nerdamer.pretty('sin(30*(pi/180))', 'TeX')).toEqual('\\frac{1}{2}');
	});

	it('defaults pretty output to TeX when the type is omitted', () => {
		expect(nerdamer.pretty('x^2+1')).toEqual(nerdamer.pretty('x^2+1', 'TeX'));
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/678
	it('converts a simplified natural logarithm to valid TeX', () => {
		expect(nerdamer.pretty('log(e^2)', 'TeX')).toEqual('2');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/660
	it('imports explicit LaTeX multiplication', () => {
		expect(nerdamer.convertFromLaTeX('a\\cdot3').text()).toEqual('3*a');
		expect(nerdamer.convertFromLaTeX('3\\cdot2').text()).toEqual('6');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/32
	it('imports short-form LaTeX fractions', () => {
		expect(nerdamer.convertFromLaTeX('\\frac12').text()).toEqual('1/2');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/37
	it('imports numeric mixed-number LaTeX as addition', () => {
		expect(nerdamer.convertFromLaTeX('2\\frac{1}{2}').text()).toEqual('5/2');
	});

	// Regressions:
	// https://github.com/jiggzson/nerdamer/issues/575
	// https://github.com/together-science/nerdamer-prime/issues/83
	it('formats logarithms without invalid TeX subscripts', () => {
		expect(nerdamer.convertToLaTeX('log(3*x)')).toEqual(
			'\\mathrm{log}\\left(3 \\cdot x\\right)'
		);
		expect(nerdamer.convertToLaTeX('log(x,y)')).toEqual(
			'\\frac{\\mathrm{log}\\left(x\\right)}{\\mathrm{log}\\left(y\\right)}'
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/397
	it('uses one defint argument order for parsing and TeX conversion', () => {
		const parsed = nerdamer('defint(x,x,0,1)');
		const tex = nerdamer.convertToLaTeX('defint(x,x,0,1)');
		const roundTrip = nerdamer.convertFromLaTeX(tex);

		expect(Expression.isExpression(parsed)).toBe(true);
		expect(Expression.isExpression(roundTrip)).toBe(true);
		if (Expression.isExpression(parsed) && Expression.isExpression(roundTrip)) {
			expect(parsed.eq('1/2')).toBe(true);
			expect(roundTrip.eq('1/2')).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/36
	it('imports arbitrary-base logarithms from LaTeX', () => {
		expect(nerdamer.convertFromLaTeX('\\log_{2}256').evaluate().text()).toEqual('8');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/660
	it('imports LaTeX summations', () => {
		expect(nerdamer.convertFromLaTeX('\\sum_{n=1}^{10}n').text()).toEqual('55');
	});
});

describe('Registered function TeX completeness', () => {
	const specializedTeXFunctions = [
		'cos',
		'sin',
		'tan',
		'sec',
		'csc',
		'cot',
		'acos',
		'asin',
		'atan',
		'asec',
		'acsc',
		'acot',
		'atan2',
		'cosh',
		'sinh',
		'tanh',
		'sech',
		'csch',
		'coth',
		'acosh',
		'asinh',
		'atanh',
		'asech',
		'acsch',
		'acoth',
		'abs',
		'sqrt',
		'nthroot',
		'cbrt',
		'log',
		'exp',
		'erf',
		'erfc',
		'gamma',
		'delta',
		'heaviside',
		'fact',
		'factorial',
		'dfact',
		'round',
		'sign',
		'floor',
		'ceil',
		'ceiling',
		'mod',
		'parens',
		'max',
		'min',
		'imagpart',
		'realpart',
		'arg',
		'conjugate',
		'determinant',
		'deg',
		'diff',
		'integrate',
		'limit',
		'laplace',
		'ilaplace',
		'sum',
		'product',
		'defint',
		'partfrac',
		'gcd',
		'lcm',
		'sinc',
		'Shi',
		'Si',
		'Chi',
		'Ci',
		'Ei',
		'Li',
	];
	// These functions have mathematical meaning but no unambiguous reversible TeX form
	// that is better than an explicit named operator. Matrix construction is kept here
	// only for the source-preserving function-call path; actual Matrix values use the
	// structured matrix formatter.
	const namedOperatorTeXFunctions = [
		'S',
		'C',
		'subst',
		'hypot',
		'trunc',
		'modinv',
		'count',
		'size',
		'contains',
		'polarform',
		'rectform',
		'csgn',
		'matrix',
		'imatrix',
		'transpose',
		'augment',
		'rref',
		'nullspace',
		'dot',
		'cross',
		'content',
		'div',
		'divide',
		'isprime',
		'fib',
	];

	// These are transformations or solver commands rather than mathematical functions
	// with a single conventional display notation.
	const transformationTeXFunctions = [
		'expand',
		'polyfactors',
		'factor',
		'simplify',
		'groebner',
		'sqcomp',
		'solve',
		'solveeqs',
	];

	// These names represent assumption state or parser control flow. Rendering them as
	// ordinary mathematical notation would obscure their procedural semantics.
	const controlTeXFunctions = [
		'assume',
		'forget',
		'unassign',
		'return',
		'break',
		'continue',
		'and',
		'or',
		'not',
		'xor',
		'iferror',
		'iserror',
		'if',
		'while',
		'for',
		'each',
		'let',
		'block',
	];

	// These functions execute immediately and do not persist as symbolic function nodes.
	// They are classified for registry completeness but have no function-form TeX to render.
	const nonSymbolicFunctions = ['evaluate', 'numeric'];

	const genericTeXFunctions = [
		...namedOperatorTeXFunctions,
		...transformationTeXFunctions,
		...controlTeXFunctions,
	];
	const renderableTeXFunctions = [...specializedTeXFunctions, ...genericTeXFunctions];
	const classifiedSystemFunctions = [...renderableTeXFunctions, ...nonSymbolicFunctions];
	const functionArguments = ['a', 'b', 'c', 'd'];

	it('classifies every system function exactly once', () => {
		const registeredSystemFunctions = Object.entries(mathFunctionRegistry)
			.filter(([, entry]) => entry.level === 'system')
			.map(([name]) => name);

		expect(new Set(classifiedSystemFunctions).size).toBe(classifiedSystemFunctions.length);
		expect([...classifiedSystemFunctions].sort()).toEqual(registeredSystemFunctions.sort());
	});

	it('keeps public symbolic functions in the central TeX coverage registry', () => {
		expect(mathFunctionRegistry.delta?.level).toBe('system');
		expect(mathFunctionRegistry.heaviside?.level).toBe('system');
		expect(mathFunctionRegistry.Li?.level).toBe('system');

		const x = Expression.Variable('x');
		expect(nerdamer.convertToLaTeX(nerdamer.delta(x))).toEqual('\\delta\\left(x\\right)');
		expect(nerdamer.convertToLaTeX(nerdamer.heaviside(x))).toEqual('H\\left(x\\right)');
		expect(nerdamer.convertToLaTeX(nerdamer.Li(x))).toEqual(
			'\\operatorname{Li}\\left(x\\right)'
		);
	});

	it.each(renderableTeXFunctions)(
		'renders registered function %s without leaking formatter placeholders',
		name => {
			const argumentCount = Math.max(0, mathFunctionRegistry[name].minArgs);
			const args = functionArguments.slice(0, argumentCount).join(',');
			const tex = nerdamer.convertToLaTeX(`${name}(${args})`);

			expect(tex.length).toBeGreaterThan(0);
			expect(tex).not.toContain('undefined');
		}
	);

	it.each(genericTeXFunctions)('uses an explicit operator fallback for %s', name => {
		const argumentCount = Math.max(0, mathFunctionRegistry[name].minArgs);
		const args = functionArguments.slice(0, argumentCount).join(',');
		const tex = nerdamer.convertToLaTeX(`${name}(${args})`);
		const escapedName = name.replace(/_/g, '\\_');

		expect(tex).toContain(`\\operatorname{${escapedName}}`);
	});

	it.each([
		['exponential', 'exp(x)', '\\exp\\left(x\\right)'],
		['callable factorial', 'factorial(x)', 'x!'],
		['grouped callable factorial', 'factorial(x+1)', '\\left(x+1\\right)!'],
		['grouped internal factorial', 'fact(x+1)', '\\left(x+1\\right)!'],
		['grouped double factorial', 'dfact(x+1)', '\\left(x+1\\right)!!'],
		['ceiling alias', 'ceiling(x)', '\\left\\lceil x \\right\\rceil'],
		['explicit parentheses', 'parens(x+1)', '\\left(x+1\\right)'],
		['complex argument', 'arg(z)', '\\arg\\left(z\\right)'],
		['complex conjugate', 'conjugate(z)', '\\overline{z}'],
		['Dirac delta', 'delta(x)', '\\delta\\left(x\\right)'],
		['Heaviside step', 'heaviside(x)', 'H\\left(x\\right)'],
		['polynomial degree', 'deg(x^2+1)', '\\deg\\left(x^{2}+1\\right)'],
		['determinant', 'determinant(A)', '\\det\\left(A\\right)'],
		['greatest common divisor', 'gcd(a,b)', '\\gcd\\left(a,b\\right)'],
		['least common multiple', 'lcm(a,b)', '\\operatorname{lcm}\\left(a,b\\right)'],
		['logarithmic integral', 'Li(x)', '\\operatorname{Li}\\left(x\\right)'],
		['round with precision', 'round(x,2)', '\\operatorname{round}\\left(x,2\\right)'],
		['implicit derivative variable', 'diff(x^2)', '\\operatorname{diff}\\left(x^{2}\\right)'],
		['implicit integration variable', 'integrate(x)', '\\operatorname{integrate}\\left(x\\right)'],
		[
			'Laplace variables',
			'laplace(sin(t),t,s)',
			'\\mathcal{L}_{t \\to s}\\left\\{\\sin\\left(t\\right)\\right\\}',
		],
		[
			'inverse Laplace variables',
			'ilaplace(1/(s^2+1),s,t)',
			'\\mathcal{L}^{-1}_{s \\to t}\\left\\{\\frac{1}{s^{2}+1}\\right\\}',
		],
	])('uses the expected notation for %s', (_label, source, expected) => {
		expect(nerdamer.convertToLaTeX(source)).toEqual(expected);
	});

	it.each([
		'round(x)',
		'round(x,2)',
		'diff(x^2)',
		'integrate(x)',
		'delta(x)',
		'heaviside(x)',
		'Li(x)',
		'conjugate((x+1)/y)',
		'deg(x^2+1)',
		'lcm(6,8)',
		'laplace(sin(t),t,s)',
		'ilaplace(1/(s^2+1),s,t)',
	])('round-trips emitted function notation: %s', source => {
		const tex = nerdamer.convertToLaTeX(source);
		const roundTrip = nerdamer.convertFromLaTeX(tex);
		const expected = Expression.create(source);

		expect(Expression.isExpression(roundTrip)).toBe(true);
		if (Expression.isExpression(roundTrip)) {
			expect(roundTrip.minus(expected).simplify().isZero()).toBe(true);
		}
	});

	it('uses generic operator notation for user-defined function expressions', () => {
		const fn = Expression.toFunction('tex_user_function', [Expression.Variable('x')]);

		expect(nerdamer.convertToLaTeX(fn)).toEqual(
			'\\operatorname{tex\\_user\\_function}\\left(x\\right)'
		);
	});
});


describe('Structured TeX conversion', () => {
	it('formats and round-trips equations without collapsing them to residual expressions', () => {
		const equation = nerdamer('x=y/2');

		expect(Equation.isEquation(equation)).toBe(true);
		if (Equation.isEquation(equation)) {
			const tex = nerdamer.convertToLaTeX(equation);
			const roundTrip = nerdamer.convertFromLaTeX(tex);

			expect(tex).toEqual('x=\\frac{y}{2}');
			expect(Equation.isEquation(roundTrip)).toBe(true);
			if (Equation.isEquation(roundTrip)) {
				expect(roundTrip.eq(equation)).toBe(true);
			}
		}
	});

	it('preserves Collection grouping in TeX and text modes', () => {
		const collection = new Collection([Expression.Variable('x'), Expression.Variable('y')]);
		const texConverter = new Converter('TeX');
		const textConverter = new Converter('text');
		const tex = texConverter.convert(collection);
		const roundTrip = nerdamer.convertFromLaTeX(tex);

		expect(tex).toEqual('\\left(x, \\, y\\right)');
		expect(textConverter.convert(collection)).toEqual('(x, y)');
		expect(Collection.isCollection(roundTrip)).toBe(true);
		if (Collection.isCollection(roundTrip)) {
			expect(roundTrip.eq(collection)).toBe(true);
		}
	});

	it('preserves standalone Vector brackets in both converter modes', () => {
		const vector = nerdamer('[x,y]');
		const texConverter = new Converter('TeX');
		const textConverter = new Converter('text');

		expect(Vector.isVector(vector)).toBe(true);
		if (Vector.isVector(vector)) {
			const tex = texConverter.convert(vector);
			const roundTrip = nerdamer.convertFromLaTeX(tex);

			expect(tex).toEqual('\\left[x, \\, y\\right]');
			expect(textConverter.convert(vector)).toEqual('[x, y]');
			expect(Vector.isVector(roundTrip)).toBe(true);
			if (Vector.isVector(roundTrip)) {
				expect(roundTrip.eq(vector)).toBe(true);
			}
		}
	});

	it('uses canonical matrix text while retaining TeX matrix environments', () => {
		const matrix = new Matrix([1, 2], [3, 4]);
		const texConverter = new Converter('TeX');
		const textConverter = new Converter('text');
		const tex = texConverter.convert(matrix);
		const roundTrip = nerdamer.convertFromLaTeX(tex);

		expect(tex).toEqual('\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}');
		expect(textConverter.convert(matrix)).toEqual('matrix([1, 2], [3, 4])');
		expect(Matrix.isMatrix(roundTrip)).toBe(true);
		if (Matrix.isMatrix(roundTrip)) {
			expect(roundTrip.eq(matrix)).toBe(true);
		}
	});

	it('formats actual value sets and round-trips empty and populated sets', () => {
		const values = nerdamer('{1,2,3}');
		const empty = new ValuesSet();
		const texConverter = new Converter('TeX');
		const textConverter = new Converter('text');

		expect(ValuesSet.isValuesSet(values)).toBe(true);
		if (ValuesSet.isValuesSet(values)) {
			const tex = texConverter.convert(values);
			const roundTrip = nerdamer.convertFromLaTeX(tex);

			expect(tex).toEqual('\\left\\{1, \\, 2, \\, 3\\right\\}');
			expect(textConverter.convert(values)).toEqual('{1, 2, 3}');
			expect(ValuesSet.isValuesSet(roundTrip)).toBe(true);
			if (ValuesSet.isValuesSet(roundTrip)) {
				expect(roundTrip.eq(values)).toBe(true);
			}
		}

		const emptyRoundTrip = nerdamer.convertFromLaTeX(texConverter.convert(empty));
		expect(ValuesSet.isValuesSet(emptyRoundTrip)).toBe(true);
		if (ValuesSet.isValuesSet(emptyRoundTrip)) {
			expect(emptyRoundTrip.count()).toBe(0);
		}
	});

	it('round-trips dictionaries with nested structured values', () => {
		const dictionary = nerdamer('{x => 1, y => [2,3]}');
		const texConverter = new Converter('TeX');
		const textConverter = new Converter('text');

		expect(Dictionary.isDictionary(dictionary)).toBe(true);
		if (Dictionary.isDictionary(dictionary)) {
			const tex = texConverter.convert(dictionary);
			const roundTrip = nerdamer.convertFromLaTeX(tex);

			expect(tex).toContain('\\mapsto');
			expect(tex).toContain('\\left[2, \\, 3\\right]');
			expect(textConverter.convert(dictionary)).toEqual('{x => 1, y => [2, 3]}');
			expect(Dictionary.isDictionary(roundTrip)).toBe(true);
			if (Dictionary.isDictionary(roundTrip)) {
				expect(roundTrip.eq(dictionary)).toBe(true);
			}
		}
	});

	it('keeps nested sets, vectors, and dictionaries separated at the correct TeX depth', () => {
		const nestedSet = nerdamer('{1,[2,3]}');
		const nestedDictionary = nerdamer('{outer => {inner => [1,2]}, x => 3}');

		const setTeX = nerdamer.convertToLaTeX(nestedSet);
		const dictionaryTeX = nerdamer.convertToLaTeX(nestedDictionary);
		const setRoundTrip = nerdamer.convertFromLaTeX(setTeX);
		const dictionaryRoundTrip = nerdamer.convertFromLaTeX(dictionaryTeX);

		expect(ValuesSet.isValuesSet(nestedSet)).toBe(true);
		expect(ValuesSet.isValuesSet(setRoundTrip)).toBe(true);
		if (ValuesSet.isValuesSet(nestedSet) && ValuesSet.isValuesSet(setRoundTrip)) {
			expect(setRoundTrip.eq(nestedSet)).toBe(true);
		}

		expect(Dictionary.isDictionary(nestedDictionary)).toBe(true);
		expect(Dictionary.isDictionary(dictionaryRoundTrip)).toBe(true);
		if (Dictionary.isDictionary(nestedDictionary) && Dictionary.isDictionary(dictionaryRoundTrip)) {
			expect(dictionaryRoundTrip.eq(nestedDictionary)).toBe(true);
		}
	});

	it('serializes SolutionSet values as ordinary set TeX without implying solver metadata', () => {
		const solutions = new SolutionSet([Expression.create(1), Expression.create(2)]);
		const tex = nerdamer.convertToLaTeX(solutions);
		const roundTrip = nerdamer.convertFromLaTeX(tex);

		expect(tex).toEqual('\\left\\{1, \\, 2\\right\\}');
		expect(ValuesSet.isValuesSet(roundTrip)).toBe(true);
		if (ValuesSet.isValuesSet(roundTrip)) {
			expect(roundTrip.text()).toEqual('{1, 2}');
		}
	});

	it('emits valid structural delimiters on the source-preserving string path', () => {
		const setTeX = nerdamer.convertToLaTeX('{1,2}');
		const dictionaryTeX = nerdamer.convertToLaTeX('{x => [1,2]}');
		const roundTrip = nerdamer.convertFromLaTeX(dictionaryTeX);

		expect(setTeX).toEqual('\\left\\{1,2\\right\\}');
		expect(dictionaryTeX).toContain('\\left\\{');
		expect(dictionaryTeX).toContain('\\mapsto');
		expect(dictionaryTeX).toContain('\\left[1,2\\right]');
		expect(Dictionary.isDictionary(roundTrip)).toBe(true);
	});
});

describe('Conversion regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/88
	it.each([
		['explicit multiplication', 'x*x', 'x \\cdot x'],
		['mixed arithmetic', '2*x+3*y-4*z', '2 \\cdot x+3 \\cdot y-4 \\cdot z'],
		[
			'multiplied grouped sums',
			'(x+1)*(y-2)',
			'\\left(x+1\\right) \\cdot \\left(y-2\\right)',
		],
		['fraction grouping', '(x+1)/(y-2)', '\\frac{x+1}{y-2}'],
		['repeated powers', 'x*x^2', 'x \\cdot x^{2}'],
		['negative powers', 's^(-2)', '\\frac{1}{s^{2}}'],
		['unary signs', '-(x+x)', '-\\left(x+x\\right)'],
		['implicit and explicit multiplication', '2(x+1)+3*y', '2\\left(x+1\\right)+3 \\cdot y'],
		['simple functions', 'sin(x)', '\\sin\\left(x\\right)'],
		['cosine functions', 'cos(x*y)', '\\cos\\left(x \\cdot y\\right)'],
		['tangent functions', 'tan((x+1)/y)', '\\tan\\left(\\frac{x+1}{y}\\right)'],
		['exponential functions', 'exp(x+x)', '\\exp\\left(x+x\\right)'],
		['floor functions', 'floor((x+x)/2)', '\\left\\lfloor \\frac{x+x}{2} \\right\\rfloor'],
		['unsimplified function arguments', 'sin(x+x)', '\\sin\\left(x+x\\right)'],
		['radicals', 'sqrt(x*x+1)', '\\sqrt{x \\cdot x+1}'],
		['logarithms', 'log(3*x)', '\\mathrm{log}\\left(3 \\cdot x\\right)'],
		[
			'arbitrary-base logarithms',
			'log(x,2)',
			'\\frac{\\mathrm{log}\\left(x\\right)}{\\mathrm{log}\\left(2\\right)}',
		],
		[
			'nested functions',
			'sin(cos(x)+sqrt(y*y))',
			'\\sin\\left(\\cos\\left(x\\right)+\\sqrt{y \\cdot y}\\right)',
		],
		['absolute values', 'abs(x*x-1)', '\\left|x \\cdot x-1\\right|'],
		['Greek and imaginary symbols', 'alpha*beta+i*x', '\\alpha \\cdot \\beta+i \\cdot x'],
		['vector brackets', '[x*x,y+1]', '\\left[x \\cdot x,y+1\\right]'],
		['integrals', 'integrate(a*x+b,x)', '\\int a \\cdot x+b\\, dx'],
		[
			'compound precedence',
			'3*(x+1)-2*(y-1)/(z+4)',
			'3 \\cdot \\left(x+1\\right)-\\frac{2 \\cdot \\left(y-1\\right)}{z+4}',
		],
		[
			'compound expression',
			'(x+x-1)/y+x^2+integrate(a+b,x)',
			'\\frac{x+x-1}{y}+x^{2}+\\int a+b\\, dx',
		],
	])('preserves %s before symbolic normalization', (_label, source, expected) => {
		expect(nerdamer.convertToLaTeX(source)).toEqual(expected);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/88
	it.each([
		'x*x',
		'2*x+3*y-4*z',
		'(x+1)*(y-2)',
		'(x+1)/(y-2)',
		'x*x^2',
		's^(-2)',
		'-(x+x)',
		'2(x+1)+3*y',
		'sin(x+x)',
		'cos(x*y)',
		'tan((x+1)/y)',
		'floor((x+x)/2)',
		'sqrt(x*x+1)',
		'log(3*x)',
		'alpha*beta+i*x',
		'3*(x+1)-2*(y-1)/(z+4)',
	])('round-trips source-preserving TeX without changing meaning: %s', source => {
		const tex = nerdamer.convertToLaTeX(source);
		const roundTrip = nerdamer.convertFromLaTeX(tex);
		const expected = Expression.create(source);

		expect(Expression.isExpression(roundTrip)).toBe(true);
		if (Expression.isExpression(roundTrip)) {
			expect(roundTrip.minus(expected).simplify().isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/88
	it('keeps source-preserving conversion isolated from canonical and decimal paths', () => {
		// Source preservation belongs to the legacy string conversion entry point.
		expect(nerdamer.pretty('x*x', 'TeX')).toEqual('x^{2}');
		expect(nerdamer.convertToLaTeX(Expression.create('x*x'))).toEqual('x^{2}');

		// Decimal conversion evaluates before formatting.
		expect(nerdamer.convertToLaTeX('1/3', { decimal: true, precision: 5 })).toEqual('0.33333');
		expect(nerdamer.convertToLaTeX('1/3', { decimals: true, precision: 5 })).toEqual('0.33333');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/531
	it('round-trips multiplication through LaTeX without turning it into exponentiation', () => {
		const source = Expression.create('2*x*(x+1)');
		const tex = nerdamer.convertToLaTeX(source);
		const roundTrip = nerdamer.convertFromLaTeX(tex);

		expect(Expression.isExpression(roundTrip)).toBe(true);
		if (Expression.isExpression(roundTrip)) {
			expect(roundTrip.minus(source).expand().isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/601
	it('imports the reported LaTeX expression without changing its value', () => {
		const imported = nerdamer.convertFromLaTeX(
			'\\frac{\\pi\\ \\cdot\\ u^{2\\cdot\\pi-1}}{5}\\ +\\ \\frac{9\\ \\cdot\\ \\pi\\ \\cdot\\ u^{\\pi-1}}{10}'
		);
		const expected = Expression.create('pi*u^(2*pi-1)/5+9*pi*u^(pi-1)/10');

		expect(Expression.isExpression(imported)).toBe(true);
		if (Expression.isExpression(imported)) {
			expect(imported.minus(expected).simplify().isZero()).toBe(true);
		}
	});
});
