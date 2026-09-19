describe('Module initialization order', () => {
	it('initializes Expression before Parser without a partial Parser export', () => {
		jest.isolateModules(() => {
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const { Parser } = jest.requireActual<
				typeof import('../../src/core/classes/parser/Parser')
			>('../../src/core/classes/parser/Parser');

			expect(Expression.create('x+1').text()).toEqual('1+x');
			expect(Parser.parse('x+1').text()).toEqual('1+x');
		});
	});

	it('initializes Parser before parser helpers', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<
				typeof import('../../src/core/classes/parser/Parser')
			>('../../src/core/classes/parser/Parser');
			const { inert } = jest.requireActual<
				typeof import('../../src/core/classes/parser/helpers')
			>('../../src/core/classes/parser/helpers');

			expect(Parser.evaluate('2^10').text()).toEqual('1024');
			expect(inert('3*x+5').text()).toEqual('5+3*x');
		});
	});

	it('initializes Vector before math container dispatch', () => {
		jest.isolateModules(() => {
			const { Vector } = jest.requireActual<
				typeof import('../../src/core/classes/vector/Vector')
			>('../../src/core/classes/vector/Vector');
			const { contains } = jest.requireActual<
				typeof import('../../src/math/math')
			>('../../src/math/math');
			const { Dictionary } = jest.requireActual<
				typeof import('../../src/core/classes/dictionary/Dictionary')
			>('../../src/core/classes/dictionary/Dictionary');
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const { ValuesSet } = jest.requireActual<
				typeof import('../../src/core/classes/valuesSet/ValuesSet')
			>('../../src/core/classes/valuesSet/ValuesSet');
			const { SolutionSet } = jest.requireActual<
				typeof import('../../src/solve/classes/SolutionSet')
			>('../../src/solve/classes/SolutionSet');

			const vector = new Vector(['x', 1, 2]);
			const values = new ValuesSet([Expression.create('a')]);
			const solutions = new SolutionSet([Expression.create('2')]);
			const dictionary = new Dictionary().set('x', Expression.create('1'));

			expect(contains(vector, 'x').text()).toEqual('1');
			expect(contains(vector, 10).text()).toEqual('0');
			expect(contains(values, 'a').text()).toEqual('1');
			expect(contains(solutions, 2).text()).toEqual('1');
			expect(contains(dictionary, 'x').text()).toEqual('1');
		});
	});

	it('initializes Expression before geometry without a partial geometry export', () => {
		jest.isolateModules(() => {
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const { hypot } = jest.requireActual<
				typeof import('../../src/math/geometry')
			>('../../src/math/geometry');

			expect(Expression.create('3+4*i').signFree().text()).toEqual('5');
			expect(
				hypot(Expression.create('3*cos(x)'), Expression.create('3*sin(x)')).text()
			).toEqual('3');
		});
	});

	it('initializes geometry before trig without a partial trig export', () => {
		jest.isolateModules(() => {
			const { hypot } = jest.requireActual<
				typeof import('../../src/math/geometry')
			>('../../src/math/geometry');
			const { sin } = jest.requireActual<
				typeof import('../../src/math/trig')
			>('../../src/math/trig');
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');

			expect(
				hypot(Expression.create('3*cos(x)'), Expression.create('3*sin(x)')).text()
			).toEqual('3');
			expect(sin(Expression.create('pi/2')).text()).toEqual('1');
		});
	});

	it('initializes expression formatting before Expression', () => {
		jest.isolateModules(() => {
			jest.requireActual<typeof import('../../src/core/classes/expression/format')>(
				'../../src/core/classes/expression/format'
			);
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');

			const expression = Expression.create('x^2+1');

			expect(expression.text()).toBe('1+x^2');
			expect(expression.sptext()).toBe('1+x**2');
		});
	});

	it('initializes expression traversal before Expression', () => {
		jest.isolateModules(() => {
			jest.requireActual<typeof import('../../src/core/classes/expression/traversal')>(
				'../../src/core/classes/expression/traversal'
			);
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const RESERVED_VARIABLE = 'reservedTraversalVariable';
			const VISIBLE_VARIABLE = 'x';
			const originalReserved = Expression.RESERVED;

			Expression.RESERVED = [...originalReserved, RESERVED_VARIABLE];
			try {
				const expression = Expression.create(`${RESERVED_VARIABLE}+${VISIBLE_VARIABLE}`);

				expect(expression.variables()).toEqual([VISIBLE_VARIABLE]);
			} finally {
				Expression.RESERVED = originalReserved;
			}
		});
	});

	it('initializes the integral table before the integrator', () => {
		jest.isolateModules(() => {
			const { tableOfIntegrals } = jest.requireActual<
				typeof import('../../src/calculus/integrate/integrationTable')
			>('../../src/calculus/integrate/integrationTable');
			const { integrate } = jest.requireActual<
				typeof import('../../src/calculus/integrate/integrate')
			>('../../src/calculus/integrate/integrate');

			expect(tableOfIntegrals).toBeDefined();
			expect(integrate('x', 'x').text()).toEqual('(1/2)*x^2');
		});
	});

	it('initializes expression shortcuts before Expression', () => {
		jest.isolateModules(() => {
			const { two } = jest.requireActual<
				typeof import('../../src/core/classes/expression/shortcuts')
			>('../../src/core/classes/expression/shortcuts');
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');

			expect(two().text()).toEqual('2');
			expect(Expression.create(2).eq(two())).toBe(true);
		});
	});

	it('initializes Matrix before math without partial modular helpers', () => {
		jest.isolateModules(() => {
			const { Matrix } = jest.requireActual<
				typeof import('../../src/core/classes/matrix/Matrix')
			>('../../src/core/classes/matrix/Matrix');
			const { matrix } = jest.requireActual<typeof import('../../src/math/math')>(
				'../../src/math/math'
			);

			expect(Matrix.identity(2).rref(5).text()).toEqual('matrix([1, 0], [0, 1])');
			expect(matrix([1, 0], [0, 1]).text()).toEqual('matrix([1, 0], [0, 1])');
		});
	});

	it('initializes Polynomial before polynomial utilities', () => {
		jest.isolateModules(() => {
			const { Polynomial } = jest.requireActual<
				typeof import('../../src/core/classes/polynomial/Polynomial')
			>('../../src/core/classes/polynomial/Polynomial');
			const { divide } = jest.requireActual<
				typeof import('../../src/core/classes/polynomial/utils')
			>('../../src/core/classes/polynomial/utils');

			const dividend = new Polynomial('x^2-1');
			const divisor = new Polynomial('x-1');

			expect(dividend.div(divisor).toString()).toEqual('x+1,0');
			expect(divide(dividend, divisor).toString()).toEqual('1+x,0');
		});
	});

	it('initializes trig before math without partial math exports', () => {
		jest.isolateModules(() => {
			const { sin } = jest.requireActual<typeof import('../../src/math/trig')>(
				'../../src/math/trig'
			);
			const { log } = jest.requireActual<typeof import('../../src/math/math')>(
				'../../src/math/math'
			);
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const { two } = jest.requireActual<
				typeof import('../../src/core/classes/expression/shortcuts')
			>('../../src/core/classes/expression/shortcuts');

			expect(sin(Expression.Pi().div(two())).text()).toEqual('1');
			expect(log(Expression.E()).text()).toEqual('1');
		});
	});

	it('initializes parser operations before the Parser singleton', () => {
		jest.isolateModules(() => {
			const { unassign } = jest.requireActual<
				typeof import('../../src/core/classes/parser/scripting/scope')
			>('../../src/core/classes/parser/scripting/scope');
			const { Parser } = jest.requireActual<
				typeof import('../../src/core/classes/parser/Parser')
			>('../../src/core/classes/parser/Parser');
			const PROBE_VARIABLE = 'circularImportProbe';

			expect(unassign(PROBE_VARIABLE).text()).toEqual(PROBE_VARIABLE);
			expect(Parser.parse('x+1').text()).toEqual('1+x');
		});
	});

	it('initializes SymbolicSolver before the solve entry point', () => {
		jest.isolateModules(() => {
			const { SymbolicSolver } = jest.requireActual<
				typeof import('../../src/solve/classes/SymbolicSolver')
			>('../../src/solve/classes/SymbolicSolver');
			const { solve } = jest.requireActual<typeof import('../../src/solve/solve')>(
				'../../src/solve/solve'
			);

			const symbolic = new SymbolicSolver('x-1', 'x').solve();

			expect(symbolic.solutions.map(solution => solution.text())).toEqual(['1']);
			expect(solve('x-1', 'x').text()).toEqual('{1}');
		});
	});

});
