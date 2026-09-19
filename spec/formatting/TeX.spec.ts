'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser as parser } from '../../src/core/classes/parser/Parser';
import { Converter } from '../../src/core/converters/Converter';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import nerdamer from '../../src/index';

import type { OptionsObject } from '../../src/core/classes/parser/types';
import type { ExpressionInput } from '../../src/core/types';
import { Parser } from '../../src/core/classes/parser/Parser';

const TeXConverter = new Converter('TeX');
const textConverter = new Converter('text');

function _(e: ExpressionInput | Matrix, options?: OptionsObject) {
	const input = Matrix.isMatrix(e) ? e : parser.parse(e);
	return TeXConverter.convert(input, options);
}

function __(e: ExpressionInput, options?: OptionsObject) {
	return textConverter.convert(parser.parse(e), options);
}

describe('General TeX', () => {
	const options = { convertRoots: false };

	it('should generate TeX correctly', () => {
		expect(_('1/2')).toEqual('\\frac{1}{2}');
		expect(_('x^-2')).toEqual('\\frac{1}{x^{2}}');
		expect(_('2*a/b')).toEqual('\\frac{2 \\cdot a}{b}');
		expect(_('(x+1)/(x+2)')).toEqual('\\frac{x+1}{x+2}');
		expect(_('(x+1)^(1/4)/(x+2)', options)).toEqual(
			'\\frac{\\left(x+1\\right)^{\\frac{1}{4}}}{x+2}'
		);
		expect(_('(3/5)(x+1)^(1/4)/(x+2)', options)).toEqual(
			'\\frac{3 \\cdot \\left(x+1\\right)^{\\frac{1}{4}}}{5 \\cdot \\left(x+2\\right)}'
		);
		expect(_('(4/5)^(x+1)^x')).toEqual('\\left(\\frac{4}{5}\\right)^{\\left(x+1\\right)^{x}}');
		expect(_('(((4+a)^(x+1)^x)/(x+1))^a/(x-1)')).toEqual(
			'\\frac{\\left(\\frac{\\left(a+4\\right)^{\\left(x+1\\right)^{x}}}{x+1}\\right)^{a}}{x-1}'
		);
		expect(_('3/2*cos((x-2)^2/b)^x')).toEqual(
			'\\frac{3 \\cdot \\left(\\cos\\left(\\frac{\\left(x-2\\right)^{2}}{b}\\right)\\right)^{x}}{2}'
		);
		expect(_('(x*y/(a*b))^(1/x)', options)).toEqual(
			'\\left(\\frac{x \\cdot y}{a \\cdot b}\\right)^{\\frac{1}{x}}'
		);
	});

	it('should set roots correctly for TeX', () => {
		expect(_('(x^(1/a)+5)^(1/3)')).toEqual('\\sqrt[3]{\\sqrt[a]{x}+5}');
		expect(_('sqrt((x^(1/a)+5))')).toEqual('\\sqrt{\\sqrt[a]{x}+5}');
		expect(_('sqrt((x^(1/a)+5))^x')).toEqual('\\left(\\sqrt[a]{x}+5\\right)^{\\frac{x}{2}}');
		expect(_('x^(1/2)', { convertRoots: false })).toEqual('x^{\\frac{1}{2}}');
	});
});

describe('General Text', () => {
	it('should convert text correctly', () => {
		expect(__('1/2')).toEqual('1/2');
		expect(__('x^-2')).toEqual('1/x^2');
		expect(__('2*a/b')).toEqual('2*a/b');
		expect(__('(x+1)/(x+2)')).toEqual('(x+1)/(x+2)');
		expect(__('(x+1)^(1/4)/(x+2)')).toEqual('(x+1)^(1/4)/(x+2)');
		expect(__('(3/5)(x+1)^(1/4)/(x+2)')).toEqual('3*(x+1)^(1/4)/(5*(x+2))');
		expect(__('(4/5)^(x+1)^x')).toEqual('(4/5)^(x+1)^x');
		expect(__('(((4+a)^(x+1)^x)/(x+1))^a/(x-1)')).toEqual(
			'((a+4)^(x+1)^x/(x+1))^a/(x-1)'
		);
		expect(__('3/2*cos((x-2)^2/b)^x')).toEqual('3*(cos((x-2)^2/b))^x/2');
		expect(__('(x*y/(a*b))^(1/x)')).toEqual('(x*y/a*b)^(1/x)');
		expect(__('3x^2-4*x+1')).toEqual('3*x^2-4*x+1');
		expect(__('x^(1/2)', { convertRoots: true })).toEqual('sqrt(x)');
	});

	it('should honor decimal precision in both converter modes', () => {
		expect(_('1/3', { decimal: true, precision: 5 })).toEqual('0.33333');
		expect(__('1/3', { decimal: true, precision: 5 })).toEqual('0.33333');
		expect(_('20/21', { decimal: true, precision: 1 })).toEqual('1.0');
		expect(__('20/21', { decimal: true, precision: 1 })).toEqual('1.0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/579
	it('should forward decimal options through convertToLaTeX', () => {
		expect(nerdamer.convertToLaTeX('1/3', { decimal: true, precision: 5 })).toEqual('0.33333');
		expect(nerdamer.convertToLaTeX('1/3', { decimals: true, precision: 5 })).toEqual('0.33333');
	});

	it('should set roots correctly for text', () => {
		expect(__('(x^(1/a)+5)^(1/3)')).toEqual('(x^(1/a)+5)^(1/3)');
		expect(__('sqrt((x^(1/a)+5))')).toEqual('sqrt(x^(1/a)+5)');
		expect(__('sqrt((x^(1/a)+5))^x')).toEqual('(x^(1/a)+5)^x/2');
	});
});

describe('Matrix TeX', () => {
	const M = new Matrix([1, 2], [3, 4]);
	it('should generate Standard Matrix TeX correctly', () => {
		expect(_(M)).toEqual('\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}');
	});
	// Regression: https://github.com/jiggzson/nerdamer/issues/584
	it('should parse scalar matrix TeX', () => {
		const parsed = TeXConverter.fromTeX('\\begin{matrix}1 & 2 \\\\ 7 & 8\\end{matrix}');

		expect(Matrix.isMatrix(parsed)).toBe(true);
		if (Matrix.isMatrix(parsed)) {
			expect(parsed.text().replace(/\s/g, '')).toEqual('matrix([1,2],[7,8])');
		}
	});
	it('should generate Parentheses Matrix TeX correctly', () => {
		expect(_(M, { matrixStyle: 'p' })).toEqual(
			'\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'
		);
	});
	it('should generate Bracketed Matrix TeX correctly', () => {
		expect(_(M, { matrixStyle: 'b' })).toEqual(
			'\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}'
		);
	});
	it('should generate Vertical Bar Matrix TeX correctly', () => {
		expect(_(M, { matrixStyle: 'v' })).toEqual(
			'\\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix}'
		);
	});
});

describe('Fraction bracket stripping', () => {
	it('should strip superfluous brackets in simple fractions', () => {
		expect(_('(x+1)/(x+2)')).toEqual('\\frac{x+1}{x+2}');
	});

	it('should preserve separate bracketed factors in a fraction numerator', () => {
		expect(nerdamer.pretty(nerdamer('(x+1)*(x+2)/x'), 'TeX')).toEqual(
			'\\frac{\\left(x+1\\right) \\cdot \\left(x+2\\right)}{x}'
		);
	});

	it('should strip superfluous brackets in denominator of unit fractions', () => {
		expect(_('1/((s-1)^2+1)')).toEqual('\\frac{1}{\\left(s-1\\right)^{2}+1}');
	});

	it('should preserve brackets when multiplier is present in denominator', () => {
		expect(_('(3/5)(x+1)^(1/4)/(x+2)', { convertRoots: false })).toEqual(
			'\\frac{3 \\cdot \\left(x+1\\right)^{\\frac{1}{4}}}{5 \\cdot \\left(x+2\\right)}'
		);
	});

	it('should preserve inner brackets that have exponents', () => {
		expect(_('(x+1)^(1/4)/(x+2)', { convertRoots: false })).toEqual(
			'\\frac{\\left(x+1\\right)^{\\frac{1}{4}}}{x+2}'
		);
	});
});

describe('Product bracketing', () => {
	it('should bracket sum factors in a product in TeX mode', () => {
		const result = _('(1+x)*(1-x)');
		expect(result).toContain('\\left(');
		expect(result).toContain('\\right)');
	});

	it('should bracket sum factors in a product in text mode', () => {
		const result = __('(1+x)*(1-x)');
		expect(result).toContain('(');
		expect(result).toContain(')');
	});
});

describe('Multiplication symbol uniformity', () => {
	it('should use \\cdot between multiplier and value in TeX mode', () => {
		expect(_('2*a/b')).toEqual('\\frac{2 \\cdot a}{b}');
	});

	it('should use \\cdot in denominator between multiplier and bracketed value', () => {
		expect(_('(3/5)(x+1)^(1/4)/(x+2)', { convertRoots: false })).toContain(
			'5 \\cdot \\left(x+2\\right)'
		);
	});
});

describe('Plain numbers', () => {
	it('should convert plain numbers to string', () => {
		expect(TeXConverter.convert(42)).toEqual('42');
		expect(TeXConverter.convert(3.14)).toEqual('3.14');
		expect(TeXConverter.convert(0)).toEqual('0');
		expect(textConverter.convert(7)).toEqual('7');
	});
});

describe('ValuesSet TeX', () => {
	it('should convert a ValuesSet to TeX', () => {
		const result = _('[1, 2, 3]');
		expect(result).toBeDefined();
	});
});

describe('SolutionSet TeX', () => {
	it('should convert a SolutionSet using set formatting', () => {
		const solutions = new SolutionSet([Expression.create(1), Expression.create(2)]);

		expect(TeXConverter.convert(solutions)).toEqual('\\left\\{1, \\, 2\\right\\}');
	});
});

describe('Dictionary TeX', () => {
	it('should use \\mapsto in TeX mode', () => {
		const result = _('{x => 1, y => 2}');
		expect(result).toContain('\\mapsto');
		expect(result).toContain('\\left\\{');
		expect(result).toContain('\\right\\}');
	});

	it('should use => in text mode', () => {
		const result = __('{x => 1, y => 2}');
		expect(result).toContain('=>');
	});
});

describe('Vector separator', () => {
	it('should use comma separator for standalone vectors in TeX mode', () => {
		const result = _('[x+1, x+2]');
		expect(result).not.toContain(' & ');
	});

	it('should use & separator inside matrix', () => {
		const M = new Matrix([1, 2], [3, 4]);
		const result = _(M);
		expect(result).toContain(' & ');
	});
});

describe('TeX regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/6
	it('preserves the complex rational expression through TeX conversion', () => {
		const original = Expression.create('(x+1)/(x^2-i)');
		const roundTrip = nerdamer.convertFromLaTeX(original.toTeX());

		expect(Expression.isExpression(roundTrip)).toBe(true);
		if (Expression.isExpression(roundTrip)) {
			expect(roundTrip.minus(original).simplify().isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/8
	it('renders rational input as decimal TeX when requested', () => {
		expect(nerdamer.convertToLaTeX('3/10', { decimal: true })).toEqual('0.3');
		expect(nerdamer.convertToLaTeX('3/10', { decimals: true })).toEqual('0.3');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/39
	it('groups multiplied sums in TeX', () => {
		expect(Expression.create('(x+1)*(x+2)').toTeX()).toEqual(
			'\\left(x+1\\right) \\cdot \\left(x+2\\right)'
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/41
	it('renders polynomial powers in descending order', () => {
		expect(Expression.create('x^2+x+1').toTeX()).toEqual('x^{2}+x+1');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/42
	it('preserves grouping when a sum is negated in TeX', () => {
		const actual = Expression.create('-1*(x-1)');

		expect(actual.toTeX()).toEqual('-\\left(x-1\\right)');
		expect(actual.eq(Expression.create('1-x'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/48
	it('renders polynomial order deterministically', () => {
		expect(Expression.create('x^2+2*x+1').toTeX()).toEqual('x^{2}+2 \\cdot x+1');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/49
	it('renders named Greek variables as LaTeX commands', () => {
		expect(Expression.create('alpha+beta').toTeX()).toEqual('\\alpha+\\beta');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/226
	it('renders epsilon with a subscript as the Greek TeX symbol', () => {
		const tex = new Converter('TeX').convert(Parser.parse('epsilon_0'));

		expect(tex).toContain('\\epsilon');
		expect(tex).toContain('_');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/227
	it('preserves a powered fraction in TeX output', () => {
		const tex = new Converter('TeX').convert(Parser.parse('(x/(x+y))^n'));

		expect(tex).toContain('\\frac');
		expect(tex).toContain('^{n}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/228
	it('preserves the reciprocal structure of a product in TeX output', () => {
		const converter = new Converter('TeX');
		const inputs = ['1/(a*b)', '1/(2*a*b)', '1/(a*b*c)', '1/(a*(b+c))', '1/(a/b)'];

		for (const input of inputs) {
			const original = Expression.create(input);
			const tex = converter.convert(original);
			const roundTrip = Expression.create(converter.fromTeX(tex));

			expect(roundTrip.eq(original)).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/307
	it('converts vectors to TeX without throwing', () => {
		const vector = nerdamer('[1,2,3]');
		const tex = nerdamer.convertToLaTeX(vector);

		expect(tex).toContain('1');
		expect(tex).toContain('2');
		expect(tex).toContain('3');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/570
	it('renders negative integer powers as denominator factors in TeX', () => {
		expect(nerdamer.convertToLaTeX('s^(-2)')).toEqual('\\frac{1}{s^{2}}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/596
	it('applies a LaTeX root index to the complete radicand', () => {
		const squareRoot = nerdamer.convertFromLaTeX('\\sqrt[2]{a}');
		const cubeRoot = nerdamer.convertFromLaTeX('\\sqrt[3]{2a}');

		expect(Expression.isExpression(squareRoot)).toBe(true);
		expect(Expression.isExpression(cubeRoot)).toBe(true);
		if (Expression.isExpression(squareRoot) && Expression.isExpression(cubeRoot)) {
			expect(Number(squareRoot.evaluate({ a: 9 }).text({ decimal: true }))).toBeCloseTo(3, 12);
			expect(Number(cubeRoot.evaluate({ a: 4 }).text({ decimal: true }))).toBeCloseTo(2, 12);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/603
	it('groups a multi-character variable suffix as one TeX subscript', () => {
		const tex = nerdamer.convertToLaTeX(Expression.create('a_ij'));
		expect(tex).toMatch(/^a_\{\{?ij\}?\}$/);
	});
});
