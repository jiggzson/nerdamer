/** Polynomial inference is optional when using core comparisons directly. */
describe('polynomial comparison module loading', () => {
	it('keeps direct relationships available independently of polynomial registration', () => {
		jest.isolateModules(() => {
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const { clearAssumptions, registerSymbolRelation } = jest.requireActual<
				typeof import('../../src/core/classes/assumption/assume')
			>('../../src/core/classes/assumption/assume');
			const { setComparisonInference } = jest.requireActual<
				typeof import('../../src/core/classes/parser/operations/compare')
			>('../../src/core/classes/parser/operations/compare');
			try {
				registerSymbolRelation({ left: 'x', operator: '>', right: 'y' });
				const x = Expression.create('x');
				const y = Expression.create('y');
				const linearX = Expression.create('2*x+3');
				const linearY = Expression.create('2*y+3');
				expect(x.gt(y)).toBe(true);
				expect(linearX.gt(linearY)).toBe(false);

				const { loadPolynomialFunctions } = jest.requireActual<
					typeof import('../../src/core/classes/polynomial/dispatch')
				>('../../src/core/classes/polynomial/dispatch');
				loadPolynomialFunctions();
				expect(x.gt(y)).toBe(true);
				expect(linearX.gt(linearY)).toBe(true);

				setComparisonInference();
				expect(x.gt(y)).toBe(true);
				expect(linearX.gt(linearY)).toBe(false);
			} finally {
				setComparisonInference();
				clearAssumptions();
			}
		});
	});
});
