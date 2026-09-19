import nerdamer from '../../src/index';
import { gcd, lcm } from '../../src/algebra/gcd/gcd';
import { partfrac } from '../../src/algebra/partfrac';
import { ilaplace } from '../../src/calculus/laplace/ilaplace';
import { Collection } from '../../src/core/classes/collection/Collection';
import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { div, divide } from '../../src/core/classes/polynomial/functions';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';
import { Vector } from '../../src/core/classes/vector/Vector';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { expand } from '../../src/core/functions/expand/expand';
import { subst } from '../../src/core/functions/subst';
import {
	doubleFactorial,
	factorial,
	max,
	min,
	nthroot,
	sinc,
} from '../../src/math/math';
import { acos, asin, atan, atan2 } from '../../src/math/trig';

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
