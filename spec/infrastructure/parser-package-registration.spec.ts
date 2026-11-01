describe('parser package registration', () => {
	it('provides base math functions through a direct parser import', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<
				typeof import('../../src/core/classes/parser/Parser')
			>('../../src/core/classes/parser/Parser');
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');

			expect(mathFunctionRegistry.block).toBeUndefined();
			expect('init' in Parser).toBe(false);
			expect(Parser.parse('sin(x)').toString()).toContain('sin');
			expect(Parser.parse('cos(x)').toString()).toContain('cos');
			expect(Parser.parse('sqrt(9)').toString()).toBe('3');
			expect(Parser.parse('log(1)').toString()).toBe('0');
			expect(Parser.parse('exp(0)').toString()).toBe('1');
			expect(Parser.parse('abs(-3)').toString()).toBe('3');
		});
	});

	it('allows arithmetic without registering optional functions', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<
				typeof import('../../src/core/classes/parser/Parser')
			>('../../src/core/classes/parser/Parser');
			expect(Parser.parse('2*x+1').toString()).toBe('1+2*x');
			expect(Parser.parse('(x+1)^2').toString()).toContain('x');
		});
	});

	it('registers optional parser functions through the public entry point', () => {
		jest.isolateModules(() => {
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');
			const initialSin = mathFunctionRegistry.sin;
			const initialLog = mathFunctionRegistry.log;
			expect(mathFunctionRegistry.block).toBeUndefined();

			const { Parser } = jest.requireActual<
				typeof import('../../src/api/parser')
			>('../../src/api/parser');

			expect(mathFunctionRegistry.sin).toBe(initialSin);
			expect(mathFunctionRegistry.log).toBe(initialLog);
			expect(mathFunctionRegistry.block.fn).toBeDefined();
			expect(mathFunctionRegistry.coeffs.fn).toBeDefined();
			expect(mathFunctionRegistry.conjugate.fn).toBeDefined();
			expect(mathFunctionRegistry.gamma.fn).toBeDefined();
			expect(mathFunctionRegistry.mean.fn).toBeDefined();
			expect(Parser.parse('sqrt(9)').toString()).toBe('3');
			expect(Parser.parse('if(1,5,6)').toString()).toBe('5');
		});
	});

	it('preserves user functions when the package registers its functions', () => {
		jest.isolateModules(() => {
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');
			const { setFunction } = jest.requireActual<
				typeof import('../../src/core/functions/setFunction')
			>('../../src/core/functions/setFunction');

			setFunction({ name: 'custominitcheck', type: 'symbolic', fn: 'x+1', argsOrder: ['x'] });
			const registered = mathFunctionRegistry.custominitcheck;
			jest.requireActual<typeof import('../../src/api/parser')>('../../src/api/parser');

			expect(mathFunctionRegistry.custominitcheck).toBe(registered);
		});
	});

	it('does not replace optional function entries when registration repeats', () => {
		jest.isolateModules(() => {
			const { registerParserFunctions } = jest.requireActual<
				typeof import('../../src/core/parserFunctions')
			>('../../src/core/parserFunctions');
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');

			registerParserFunctions();
			const mean = mathFunctionRegistry.mean;
			const gamma = mathFunctionRegistry.gamma;
			const block = mathFunctionRegistry.block;
			registerParserFunctions();

			expect(mathFunctionRegistry.mean).toBe(mean);
			expect(mathFunctionRegistry.gamma).toBe(gamma);
			expect(mathFunctionRegistry.block).toBe(block);
		});
	});

	it('does not replace full-package entries when registration repeats', () => {
		jest.isolateModules(() => {
			const { registerNerdamerFunctions } = jest.requireActual<
				typeof import('../../src/core/nerdamerFunctions')
			>('../../src/core/nerdamerFunctions');
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');

			registerNerdamerFunctions();
			const factor = mathFunctionRegistry.factor;
			const integrate = mathFunctionRegistry.integrate;
			const solve = mathFunctionRegistry.solve;
			registerNerdamerFunctions();

			expect(mathFunctionRegistry.factor).toBe(factor);
			expect(mathFunctionRegistry.integrate).toBe(integrate);
			expect(mathFunctionRegistry.solve).toBe(solve);
		});
	});

	it('preserves full-package functions when the parser entry point is imported', () => {
		jest.isolateModules(() => {
			const { registerNerdamerFunctions } = jest.requireActual<
				typeof import('../../src/core/nerdamerFunctions')
			>('../../src/core/nerdamerFunctions');
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');

			registerNerdamerFunctions();
			const integrate = mathFunctionRegistry.integrate;
			const solve = mathFunctionRegistry.solve;
			const mean = mathFunctionRegistry.mean;
			const gamma = mathFunctionRegistry.gamma;
			jest.requireActual<typeof import('../../src/api/parser')>('../../src/api/parser');

			expect(mathFunctionRegistry.integrate).toBe(integrate);
			expect(mathFunctionRegistry.solve).toBe(solve);
			expect(mathFunctionRegistry.mean).toBe(mean);
			expect(mathFunctionRegistry.gamma).toBe(gamma);
			expect(mathFunctionRegistry.sin.fn).toBeDefined();
		});
	});
});
