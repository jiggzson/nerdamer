import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { AssignmentError } from '../../src/core/errors';

describe('Parser function declarations', () => {
	it('defines symbolic functions through the public declaration syntax', () => {
		const previousF = mathFunctionRegistry.f;
		const previousG = mathFunctionRegistry.g;

		try {
			nerdamer('f(x):=x^2');
			expect(nerdamer('f(3)').text()).toEqual('9');
			expect(nerdamer('f(a+b)').text()).toEqual('(a+b)^2');

			nerdamer('g(x, y) := x^2+y');
			expect(nerdamer('g(3, 4)').text()).toEqual('13');

			nerdamer('f(x):=x+1');
			expect(nerdamer('f(3)').text()).toEqual('4');
		} finally {
			if (previousF) {
				mathFunctionRegistry.f = previousF;
			} else {
				delete mathFunctionRegistry.f;
			}
			if (previousG) {
				mathFunctionRegistry.g = previousG;
			} else {
				delete mathFunctionRegistry.g;
			}
		}
	});

	it('does not allow user declarations or setFunction to override system functions', () => {
		const factorialEntry = mathFunctionRegistry.factorial;
		const sinEntry = mathFunctionRegistry.sin;

		expect(() => nerdamer('factorial(n):=42')).toThrow(AssignmentError);
		expect(mathFunctionRegistry.factorial).toBe(factorialEntry);
		expect(nerdamer('factorial(5)').text()).toEqual('120');

		expect(() => nerdamer.setFunction('sin', ['x'], '42')).toThrow(AssignmentError);
		expect(mathFunctionRegistry.sin).toBe(sinEntry);
		expect(nerdamer('sin(0)').text()).toEqual('0');
	});

	it('reuses late-bound self references in deferred recursive functions', () => {
		const name = 'script_recursive_factorial';
		delete mathFunctionRegistry[name];

		try {
			nerdamer(`${name}(n):=if(n<=1,1,n*${name}(n-1))`);

			expect(nerdamer(`${name}(1)`).text()).toEqual('1');
			expect(nerdamer(`${name}(2)`).text()).toEqual('2');
			expect(nerdamer(`${name}(3)`).text()).toEqual('6');
			expect(nerdamer(`${name}(5)`).text()).toEqual('120');
			expect(nerdamer(`${name}(5)`).text()).toEqual('120');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('rejects undefined multi-argument function calls', () => {
		const previousFoo = mathFunctionRegistry.foo;

		try {
			delete mathFunctionRegistry.foo;

			expect(() => nerdamer('foo(x, x^2)')).toThrow('Unsupported function foo');

			const implicitProduct = nerdamer('x(y+1)');
			expect(Expression.isExpression(implicitProduct)).toBe(true);
			if (Expression.isExpression(implicitProduct)) {
				expect(implicitProduct.eq(Expression.create('x*(y+1)'))).toBe(true);
			}

			expect(() => nerdamer('x*(y,z)')).not.toThrow();

			nerdamer.setFunction('foo', ['x', 'y'], 'x+y');
			expect(nerdamer('foo(2,3)').text()).toEqual('5');
		} finally {
			if (previousFoo) {
				mathFunctionRegistry.foo = previousFoo;
			} else {
				delete mathFunctionRegistry.foo;
			}
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/282
	it('propagates symbolic-function substitutions through nested calls', () => {
		const name = 'legacy282f';

		try {
			nerdamer.setFunction(name, ['a', 'b'], 'a+sin(b)');
			expect(nerdamer(`${name}(3,x)`).eq(nerdamer('3+sin(x)'))).toBe(true);
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/349
	it('keeps symbolic-function argument substitution scoped to the call', () => {
		const name = 'legacy349f';

		try {
			nerdamer.setFunction(name, ['x', 'y'], 'x^2+y');
			expect(nerdamer(`${name}(4,7)+x+y`).text()).toEqual('23+x+y');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/582
	it('composes nested registered symbolic functions', () => {
		const outerName = 'audit_legacy_582_outer';
		const innerName = 'audit_legacy_582_inner';

		try {
			nerdamer.setFunction(outerName, ['x'], '2*x');
			nerdamer.setFunction(innerName, ['x'], 'x^2');
			const actual = nerdamer(`${outerName}(${innerName}(x))`);

			expect(Expression.isExpression(actual)).toBe(true);
			if (Expression.isExpression(actual)) {
				expect(actual.minus('2*x^2').simplify().isZero()).toBe(true);
			}
		} finally {
			delete mathFunctionRegistry[outerName];
			delete mathFunctionRegistry[innerName];
		}
	});
});