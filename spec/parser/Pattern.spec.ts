'use strict';

import { Parser } from '../../src/core/classes/parser/Parser';
import { Pattern } from '../../src/core/converters/Pattern';

import type { Expression } from '../../src/core/classes/expression/Expression';

describe('Expression Pattern', () => {
	it('should convert expressions to patterns', () => {
		expect(new Pattern('1', ['x']).patternString).toEqual('a1');
		expect(new Pattern('1/2', ['x']).patternString).toEqual('a1');
		expect(new Pattern('x', ['x']).patternString).toEqual('a1*x1^n1');
		expect(new Pattern('x^2', ['x']).patternString).toEqual('a1*x1^n1');
		expect(new Pattern('3*x^2', ['x']).patternString).toEqual('a1*x1^n1');
		expect(new Pattern('3*x', ['x']).patternString).toEqual('a1*x1^n1');
		expect(new Pattern('1/x', ['x']).patternString).toEqual('a1/x1^n1');
		expect(new Pattern('2/(3*x^2)', ['x']).patternString).toEqual('a1/x1^n1');
		expect(new Pattern('2*a', ['x']).patternString).toEqual('a1');
		expect(new Pattern('2*a*b', ['x']).patternString).toEqual('a1');
		expect(new Pattern('2*a*x^2', ['x']).patternString).toEqual('a1*x1^n1');
		expect(new Pattern('2*a*b*x^2', ['x']).patternString).toEqual('a1*x1^n1');
		expect(new Pattern('2*a*x^2*y', ['x', 'y']).patternString).toEqual('a1*x1^n1*x2^n2');
		expect(new Pattern('2*a*x^2/y', ['x', 'y']).patternString).toEqual('(a1*x1^n1)/x2^n2');
		expect(new Pattern('2*a/y', ['x', 'y']).patternString).toEqual('a1/x2^n1');
		expect(new Pattern('a+b', ['x']).patternString).toEqual('a1');
		expect(new Pattern('x+y', ['x', 'y']).patternString).toEqual('a1*(a2*x1^n1+a3*x2^n2)^n3');
		expect(new Pattern('2*(x+y)^2', ['x', 'y']).patternString).toEqual(
			'a1*(a2*x1^n1+a3*x2^n2)^n3'
		);
		expect(new Pattern('2*(x^2+y^5)^2', ['x', 'y']).patternString).toEqual(
			'a1*(a2*x1^n1+a3*x2^n2)^n3'
		);
		expect(new Pattern('cos(x)', ['x']).patternString).toEqual('a1*cos(a2*x1^n1)^n2');
		expect(new Pattern('cos(a)', ['x']).patternString).toEqual('a1');
		expect(new Pattern('a*cos(a)', ['x']).patternString).toEqual('a1');
		expect(new Pattern('cos(8)', ['x']).patternString).toEqual('a1');
		expect(new Pattern('a+(a+x)^2', ['x']).patternString).toEqual(
			'a1*(a2*(a3*x1^n1+a4)^n2+a4)^n3'
		);
		expect(new Pattern('a+(a+b+x)^2', ['x']).patternString).toEqual(
			'a1*(a2*(a3*x1^n1+a4)^n2+a5)^n3'
		);
		expect(new Pattern('a+2+(a-b+x)^2', ['x']).patternString).toEqual(
			'a1*(a2*(a3*x1^n1+a4)^n2+a5)^n3'
		);
		expect(new Pattern('a+2+(a+b+x)^2', ['x']).patternString).toEqual(
			'a1*(a2*(a3*x1^n1+a4)^n2+a5)^n3'
		);
		expect(new Pattern('2*(2+a+b*x^2)^2', ['x']).patternString).toEqual('a1*(a2*x1^n1+a3)^n2');
		expect(new Pattern('2*x/(x^2+a+b+c+111155525)', ['x']).patternString).toEqual(
			'(a1*x1^n1)/((a2*x1^n2+a3)^n3)'
		);
		expect(new Pattern('sec(x)*tan(x)', ['x']).patternString).toEqual(
			'a1*sec(a2*x1^n1)^n2*tan(a3*x1^n3)^n4'
		);
		expect(new Pattern('x*e^x', ['x']).patternString).toEqual('a1*(a2)^(a3*x1^n1)*x1^n2');
		expect(new Pattern('e^x', ['x']).patternString).toEqual('a1*(a2)^(a3*x1^n1)');
		expect(new Pattern('(x+1)/(x-1)', ['x']).patternString).toEqual(
			'(a1*((a4*x1^n3+a5)^n4))/((a2*x1^n1+a3)^n2)'
		);
		expect(new Pattern('1/(x*(1+x))', ['x']).patternString).toEqual(
			'a1/(x1^n1*((a2*x1^n2+a3)^n3))'
		);
	});

	it('should correctly link the references', () => {
		expect((new Pattern('x^2', ['x']).get('n1') as Expression).text()).toEqual('2');
		expect((new Pattern('3*x^2', ['x']).get('n1') as Expression).text()).toEqual('2');
		expect((new Pattern('3*x^2', ['x']).get('a1') as Expression).text()).toEqual('3');
		expect((new Pattern('2*a*b*x^2', ['x']).get('a1') as Expression).text()).toEqual('2*a*b');
		expect((new Pattern('2(a*2*x)^2', ['x']).get('n1') as Expression).text()).toEqual('2');
		expect((new Pattern('2*(2+a+b*x^2)^2', ['x']).get('a2') as Expression).text()).toEqual('b');
		expect((new Pattern('2*(2+a+b*x^2)^2', ['x']).get('a3') as Expression).text()).toEqual(
			'2+a'
		);
		expect(
			(new Pattern('2*x/(3*x^2+a+b+c+111155525)', ['x']).get('a2') as Expression).text()
		).toEqual('3');
		expect(
			(new Pattern('2*x/(x^2+a+b+c+111155525)', ['x']).get('a3') as Expression).text()
		).toEqual('a+b+c+111155525');
	});

	it('should reuse references', () => {
		expect(new Pattern('a+(a+x)^2', ['x'], { reuseReferences: true }).patternString).toEqual(
			'a1*(a2*(a3*x1^n1+a4)^n2+a4)^n3'
		);
	});

	it('should recover the expression from pattern', () => {
		const inputStr = '2*(2+a+b*x^2)^2';
		const p1 = new Pattern(inputStr, ['x']);
		const inputStr2 = 'cos(x)^cos(x)';
		const p2 = new Pattern(inputStr2, ['x']);
		const inputStr3 = '1/x';
		const p3 = new Pattern(inputStr3, ['x']);
		const inputStr4 = '2*x/(x^2+a+b+c+111155525)';
		const p4 = new Pattern(inputStr4, ['x']);
		expect((Parser.parse(p1.patternString, p1.references) as Expression).eq(inputStr)).toBe(
			true
		);
		expect((Parser.parse(p2.patternString, p2.references) as Expression).eq(inputStr2)).toBe(
			true
		);
		expect((Parser.parse(p3.patternString, p3.references) as Expression).eq(inputStr3)).toBe(
			true
		);
		expect((Parser.parse(p4.patternString, p4.references) as Expression).eq(inputStr4)).toBe(
			true
		);
	});

	it('should be customizable', () => {
		expect(
			new Pattern('a*(x-1)^a', ['x'], {
				constantSymbol: 'c',
				powerSymbol: 'p',
				variableSymbol: 'X',
				reuseReferences: false,
			}).patternString
		).toEqual('c1*(c2*X1^p1+c3)^p2');
	});
});
