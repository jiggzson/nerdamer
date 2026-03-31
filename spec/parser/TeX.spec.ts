'use strict';

import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser as parser } from '../../src/core/classes/parser/Parser';
import { Converter } from '../../src/core/converters/Converter';

import type { OptionsObject } from '../../src/core/classes/parser/types';

const TeXConverter = new Converter('TeX');
const textConverter = new Converter('text');

function _(e, options?: OptionsObject) {
	return TeXConverter.convert(parser.parse(e), options);
}

function __(e, options?: OptionsObject) {
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
			'\\frac{\\frac{\\left(\\left(a+4\\right)^{\\left(x+1\\right)^{x}}\\right)^{a}}{\\left(x+1\\right)^{a}}}{x-1}'
		);
		expect(_('3/2*cos((x-2)^2/b)^x')).toEqual(
			'\\frac{3 \\cdot \\left(\\cos\\left(\\frac{\\left(x-2\\right)^{2}}{b}\\right)\\right)^{x}}{2}'
		);
		expect(_('(x*y/(a*b))^(1/x)', options)).toEqual(
			'\\frac{x^{\\frac{1}{x}} \\cdot y^{\\frac{1}{x}}}{\\left(a \\cdot b\\right)^{\\frac{1}{x}}}'
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
		expect(__('(((4+a)^(x+1)^x)/(x+1))^a/(x-1)')).toEqual('((a+4)^(x+1)^x)^a/(x+1)^a/(x-1)');
		expect(__('3/2*cos((x-2)^2/b)^x')).toEqual('3*(cos((x-2)^2/b))^x/2');
		expect(__('(x*y/(a*b))^(1/x)')).toEqual('x^(1/x)*y^(1/x)/(a*b)^(1/x)');
		expect(__('3x^2-4*x+1')).toEqual('3*x^2-4*x+1');
		expect(__('x^(1/2)', { convertRoots: true })).toEqual('sqrt(x)');
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
