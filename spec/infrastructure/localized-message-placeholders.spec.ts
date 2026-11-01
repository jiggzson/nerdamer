import Decimal from 'decimal.js';

import '../../src/index';
import '../../src/api/languages/spa';
import { Expression } from '../../src/core/classes/expression/Expression';
import { symbols } from '../../src/core/classes/expression/shortcuts';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { message } from '../../src/core/errors';
import { Settings } from '../../src/core/Settings';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';

describe('Localized message placeholder contracts', () => {
	const initialLanguage = Settings.LANGUAGE;

	afterEach(() => {
		jest.restoreAllMocks();
		Settings.LANGUAGE = initialLanguage;
	});

	it.each(['eng', 'spa'] as const)('includes the rejected variable in %s', language => {
		Settings.LANGUAGE = language;
		expect(() => symbols('x+1')).toThrow(
			message('plainVariableExpected', { input: 'x+1' })
		);
	});

	it.each(['eng', 'spa'] as const)('formats exhausted Brent iterations in %s', language => {
		Settings.LANGUAGE = language;
		const solver = new FunctionSolver('x-0.25', 'x', { maxIterations: 0 });
		const result = solver.Brent(new Decimal(0), new Decimal(1));
		expect(result.converged).toBe(false);
		expect(result.errorMsg).toBe(message('convergenceFailed', { iters: '0' }));
		expect(result.errorMsg).not.toContain('{{');
	});

	it.each(['eng', 'spa'] as const)('includes unsupported evaluated type in %s', language => {
		Settings.LANGUAGE = language;
		const solver = new FunctionSolver('x', 'x');
		jest.spyOn(Parser, 'parseRPN').mockReturnValue(new Vector([Expression.Number(1)]));
		expect(() => solver.evaluate(1)).toThrow(
			message('unsupportedType', { type: 'VEC' })
		);
	});
});
