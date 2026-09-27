import nerdamer from '../../src/index';
import { pfactor, pfactord } from '../../src/algebra/factor/factor';
import { gcd, lcm } from '../../src/algebra/gcd/gcd';
import { partfrac } from '../../src/algebra/partfrac';
import { ilaplace } from '../../src/calculus/laplace/ilaplace';
import { Collection } from '../../src/core/classes/collection/Collection';
import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { zero } from '../../src/core/classes/expression/shortcuts';
import { invert } from '../../src/core/classes/matrix/functions';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { coeffs, div, divide } from '../../src/core/classes/polynomial/functions';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { expand } from '../../src/core/functions/expand/expand';
import { subst } from '../../src/core/functions/subst';
import { line } from '../../src/math/geometry';
import {
	degrees,
	doubleFactorial,
	factorial,
	gammaIncomplete,
	gammaIncompleteLower,
	log10,
	max,
	min,
	nthroot,
	parens,
	radians,
	rect,
	scientific,
	sinc,
	step,
	tri,
} from '../../src/math/math';
import { acos, asin, atan, atan2 } from '../../src/math/trig';
import { continuedFraction } from '../../src/math/utils';
import { roots } from '../../src/solve/solve';

describe('Public compatibility entry points', () => {
	it('keeps Expression text and TeX conversion methods available at runtime', () => {
		const expression = Expression.create('x^2+1');

		expect(expression.toText()).toEqual(nerdamer.pretty(expression, 'text'));
		expect(expression.toTeX()).toEqual(nerdamer.pretty(expression, 'TeX'));
	});

	it('keeps legacy decimal TeX options available', () => {
		const expression = Expression.create('1/2');

		expect(expression.toTeX('decimal')).toEqual('0.5');
		expect(expression.toTeX('decimals')).toEqual('0.5');
		expect(expression.latex('decimal')).toEqual('0.5');
		expect(nerdamer.convertToLaTeX('1/2', 'decimals')).toEqual('0.5');
	});

	it('keeps the compatibility top-level TeX conversion entry point available', () => {
		expect(nerdamer.convertToLaTeX('x^2+1')).toEqual(nerdamer.pretty('x^2+1', 'TeX'));
	});

	it('formats polar forms without treating complex exponents as ordered values', () => {
		const tex = nerdamer.pretty('polarform(3+4*i)', 'TeX');

		expect(tex.length).toBeGreaterThan(0);
		expect(tex).toContain('e');
		expect(tex).toContain('i');
	});

	it('keeps commonly used legacy algebra functions on the main nerdamer object', () => {
		expect(nerdamer.expand).toBe(expand);
		expect(nerdamer.gcd).toBe(gcd);
		expect(nerdamer.lcm).toBe(lcm);
		expect(nerdamer.partfrac).toBe(partfrac);
		expect(nerdamer.divide).toBe(divide);
		expect(nerdamer.div).toBe(div);
		expect(nerdamer.subst).toBe(subst);
	});

	it('keeps matching legacy function names on the main nerdamer object', () => {
		expect(nerdamer.arccos).toBe(acos);
		expect(nerdamer.arcsin).toBe(asin);
		expect(nerdamer.arctan).toBe(atan);
		expect(nerdamer.atan2).toBe(atan2);
		expect(nerdamer.nthroot).toBe(nthroot);
		expect(nerdamer.factorial).toBe(factorial);
		expect(nerdamer.dfactorial).toBe(doubleFactorial);
		expect(nerdamer.min).toBe(min);
		expect(nerdamer.max).toBe(max);
		expect(nerdamer.sinc).toBe(sinc);
		expect(nerdamer.ilt).toBe(ilaplace);
	});

	it('restores the legacy reserved-name helper through current parser state', () => {
		expect(nerdamer.isReserved('e')).toBe(true);
		expect(nerdamer.isReserved('pi')).toBe(true);
		expect(nerdamer.isReserved('_n')).toBe(true);
		expect(nerdamer.isReserved('all')).toBe(true);
		expect(nerdamer.isReserved('ordinary_variable')).toBe(false);
	});

	it('restores independent legacy math helpers without duplicating existing algorithms', () => {
		expect(nerdamer.radians).toBe(radians);
		expect(nerdamer.degrees).toBe(degrees);
		expect(nerdamer.log10).toBe(log10);
		expect(nerdamer.step).toBe(step);
		expect(nerdamer.rect).toBe(rect);
		expect(nerdamer.tri).toBe(tri);
		expect(nerdamer.continued_fraction).toBe(continuedFraction);
		expect(nerdamer.parens('x+1').text()).toEqual('(1+x)');
		expect(nerdamer.gamma_incomplete).toBe(gammaIncomplete);
		expect(nerdamer.gamma_incomplete_lower).toBe(gammaIncompleteLower);
		expect(nerdamer.parens).toBe(parens);
		expect(nerdamer.invert).toBe(invert);
		expect(nerdamer.line).toBe(line);

		expect(nerdamer('radians(180)').text()).toEqual('pi');
		expect(nerdamer('degrees(pi)').text()).toEqual('180');
		expect(nerdamer('log10(1000)').text()).toEqual('3');

		expect(nerdamer('step(-1)').text()).toEqual('0');
		expect(nerdamer('step(0)').text()).toEqual('1');
		expect(nerdamer('heaviside(0)').text()).toEqual('1/2');
		expect(nerdamer('rect(0)').text()).toEqual('1');
		expect(nerdamer('rect(1/2)').text()).toEqual('1/2');
		expect(nerdamer('rect(1)').text()).toEqual('0');
		expect(nerdamer('tri(0)').text()).toEqual('1');
		expect(nerdamer('tri(1/2)').text()).toEqual('1/2');
		expect(nerdamer('tri(1)').text()).toEqual('0');

		expect(nerdamer('continued_fraction(415/93)').text()).toEqual('(1, 4, [2, 6, 7])');
		expect(nerdamer('continued_fraction(415/93,2)').text()).toEqual('(1, 4, [2, 6])');
		expect(nerdamer('continued_fraction(-415/93)').text()).toEqual('(-1, 4, [2, 6, 7])');
		expect(nerdamer('gamma_incomplete(1,x)').eq(nerdamer('e^(-x)'))).toBe(true);
		expect(
			nerdamer('gamma_incomplete(4,x)+gamma_incomplete_lower(4,x)-gamma(4)')
				.simplify()
				.eq(zero())
		).toBe(true);

		expect(nerdamer('invert(matrix([1,2],[3,4]))').text()).toEqual(
			'matrix([-2, 1], [3/2, -1/2])'
		);
		expect(nerdamer('line([1,2],[3,4])').text()).toEqual('1+x');
	});

	it('restores the remaining legacy algebra and formatting helpers through existing APIs', () => {
		expect(nerdamer.pfactor).toBe(pfactor);
		expect(nerdamer.pfactord).toBe(pfactord);
		expect(nerdamer.coeffs).toBe(coeffs);
		expect(nerdamer.roots).toBe(roots);
		expect(nerdamer.scientific).toBe(scientific);

		expect(nerdamer('pfactor(100)').text()).toEqual('[2, 2, 5, 5]');
		expect(nerdamer('pfactor(2310)').text()).toEqual('[2, 3, 5, 7, 11]');
		expect(nerdamer('pfactor(1)').text()).toEqual('[]');
		expect(nerdamer('pfactord(100)').text()).toEqual('{2 => 2, 5 => 2}');
		expect(nerdamer('pfactord(2310)').text()).toEqual('{2 => 1, 3 => 1, 5 => 1, 7 => 1, 11 => 1}');
		expect(nerdamer('pfactord(1)').text()).toEqual('{}');
		expect(() => pfactor(zero())).toThrow(nerdamer.errors.UnexpectedInputError);
		expect(() => pfactord(zero())).toThrow(nerdamer.errors.UnexpectedInputError);
		expect(nerdamer('coeffs(x^2+2*x+1,x)').text()).toEqual('[1, 2, 1]');
		expect(nerdamer('coeffs(a*b*x^2+c*x+d,x)').text()).toEqual('[d, c, a*b]');

		const polynomialRoots = nerdamer('roots(x^2-1,x)');
		expect(Vector.isVector(polynomialRoots)).toBe(true);
		if (Vector.isVector(polynomialRoots)) {
			expect(polynomialRoots.elements.map(root => root.text()).sort()).toEqual(['-1', '1']);
		}

		const constantRoots = nerdamer('roots(4)');
		expect(Vector.isVector(constantRoots)).toBe(true);
		if (Vector.isVector(constantRoots)) {
			expect(constantRoots.elements.map(root => root.text()).sort()).toEqual(['-2', '2']);
		}

		const source = Expression.create('12345');
		const formatted = scientific(source, 3);
		const evaluated = formatted.evaluate();
		expect(source.scientific).toBeUndefined();
		expect(formatted.text()).toEqual('1.23e4');
		expect(formatted.eq(source)).toBe(true);
		expect(evaluated.eq(source)).toBe(true);
		expect(evaluated.text()).toEqual('1.23e4');
		expect(source.text({ scientific: 3 })).toEqual('1.23e4');
		expect(nerdamer('scientific(12345,3)').text()).toEqual('1.23e4');
		expect(nerdamer('scientific(1200,4)').text()).toEqual('1.200e3');
		expect(() => scientific(source, 0)).toThrow(nerdamer.errors.UnexpectedInputError);
		expect(() => scientific(source, 1_000_000_001)).toThrow(
			nerdamer.errors.UnexpectedInputError
		);
	});

	it('adds selected exported functions to parsed expressions, vectors, and matrices', () => {
		expect(nerdamer('x^2').diff('x').text()).toEqual('2*x');

		const vector = nerdamer('[x^2,sin(x)]').diff('x');
		expect(Vector.isVector(vector)).toBe(true);
		if (Vector.isVector(vector)) {
			expect(vector.elements[0].text()).toEqual('2*x');
			expect(vector.elements[1].text()).toEqual('cos(x)');

			const substituted = vector.subst('x', 'y');
			expect(substituted.elements[0].text()).toEqual('2*y');
			expect(substituted.elements[1].text()).toEqual('cos(y)');
		}

		const matrix = nerdamer('matrix([cos(x)^2+sin(x)^2],[(1+x)/x])').simplify();
		expect(Matrix.isMatrix(matrix)).toBe(true);
		if (Matrix.isMatrix(matrix)) {
			expect(matrix.elements[0][0].text()).toEqual('1');
		}
	});

	it('compiles parsed scalar expressions through chained buildFunction', () => {
		const f = nerdamer('cos(x)').buildFunction(['x']);

		expect(f(0)).toBe(1);
	});

	it('rejects structured parsed results from chained buildFunction', () => {
		for (const input of ['[x,y]', 'matrix([x,y])', 'x=y']) {
			expect(() => nerdamer(input).buildFunction()).toThrow(
				nerdamer.errors.UnexpectedDataType
			);
			expect(() => nerdamer(input).buildFunction()).toThrow('Expression expected');
		}
	});

	it('applies chained transformations to both sides of an equation', () => {
		const equation = nerdamer('x^2=y').diff('x');

		expect(Equation.isEquation(equation)).toBe(true);
		if (Equation.isEquation(equation)) {
			expect(equation.text()).toEqual('2*x=0');
		}
	});

	it('applies chained transformations to bundled container members', () => {
		const collection = new Collection([
			Expression.create('x^2'),
			Expression.create('sin(x)'),
		]).diff('x');
		expect(collection.text()).toEqual('(2*x, cos(x))');

		const dictionary = new Dictionary(
			new Map([
				['first', Expression.create('cos(x)^2+sin(x)^2')],
				['second', Expression.create('x+x')],
			])
		).simplify();
		expect(dictionary.get('first')?.text()).toEqual('1');
		expect(dictionary.get('second')?.text()).toEqual('2*x');

		const values = new ValuesSet([
			Expression.create('x^2'),
			Expression.create('x^3'),
		]).diff('x');
		expect(values.at(0)?.text()).toEqual('2*x');
		expect(values.at(1)?.text()).toEqual('3*x^2');
	});

	it('leaves class-owned methods in place when updateAPI runs again', () => {
		const expressionBuildFunction = Expression.prototype.buildFunction;
		const expressionExpand = Expression.prototype.expand;
		const matrixExpand = Matrix.prototype.expand;
		const vectorExpand = Vector.prototype.expand;

		expect(nerdamer.updateAPI()).toBe(nerdamer);
		expect(Expression.prototype.buildFunction).toBe(expressionBuildFunction);
		expect(Expression.prototype.expand).toBe(expressionExpand);
		expect(Matrix.prototype.expand).toBe(matrixExpand);
		expect(Vector.prototype.expand).toBe(vectorExpand);
	});

	it('does not chain parser functions that are not selected by the root API', () => {
		const name = 'compatibility_parser_only_function';

		try {
			expect(nerdamer.setFunction(name, ['x'], 'x+1')).toBe(nerdamer);
			expect(nerdamer.updateAPI()).toBe(nerdamer);
			expect((Expression.prototype as unknown as Record<string, unknown>)[name]).toBeUndefined();
			expect((nerdamer as unknown as Record<string, unknown>)[name]).toBeUndefined();
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('keeps the compatibility symbolic setFunction signature available', () => {
		const name = 'legacy_api_test_function';

		try {
			expect(nerdamer.setFunction(name, ['x', 'y'], 'x^2+y')).toBe(nerdamer);
			expect(nerdamer(`${name}(4,7)`).text()).toEqual('23');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('keeps the compatibility setConstant entry point available', () => {
		expect(nerdamer.setConstant('legacy_api_test_constant', 9.81)).toBe(nerdamer);
		expect(nerdamer('100*legacy_api_test_constant').text()).toEqual('981');
		expect(
			nerdamer('100*legacy_api_test_constant', { legacy_api_test_constant: 2 }).text()
		).toEqual('981');

		nerdamer.setConstant('legacy_api_test_constant', 'delete');
		expect(nerdamer('legacy_api_test_constant').text()).toEqual('legacy_api_test_constant');
	});

	it('keeps compatibility settings and known-value entry points available', () => {
		const first = 'legacy_api_test_var';
		const second = 'legacy_api_test_var_2';

		expect(nerdamer.set('SORT_TERMS', false)).toBe(nerdamer);
		expect(nerdamer.set({ SORT_TERMS: false })).toBe(nerdamer);

		try {
			nerdamer.setVar(first, 11);
			expect(nerdamer(first).text()).toEqual('11');
			expect(nerdamer(first, { [first]: 13 }).text()).toEqual('13');
			expect(nerdamer.getVars('text')[first]).toEqual('11');
			expect(nerdamer.getVars('LaTeX')[first]).toEqual('11');

			nerdamer.setVar(first, 'delete');
			expect(nerdamer(first).text()).toEqual(first);

			nerdamer.setVar(first, 2);
			nerdamer.setVar(second, 3);
			expect(nerdamer.clearVars()).toBe(nerdamer);
			expect(nerdamer(first).text()).toEqual(first);
			expect(nerdamer(second).text()).toEqual(second);
		} finally {
			nerdamer.setVar(first, 'delete');
			nerdamer.setVar(second, 'delete');
		}
	});
});
