import '../../src/api/languages/spa';
import '../../src/api/languages/fra';
import '../../src/api/languages/deu';
import '../../src/api/languages/por';
import '../../src/api/languages/ita';
import '../../src/api/languages/nld';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { ModularSparsePolynomial } from '../../src/algebra/polynomial/ModularSparsePolynomial';
import { factorSquareFreeUnivariateFiniteField } from '../../src/algebra/polynomial/ModularSparsePolynomialFactor';
import { Assumption } from '../../src/core/classes/assumption/Assumption';
import { DecimalSet } from '../../src/core/classes/decimalSet/DecimalSet';
import { Expression } from '../../src/core/classes/expression/Expression';
import { callFunction } from '../../src/core/classes/parser/operations/functions';
import { multiply } from '../../src/core/classes/parser/operations/multiply';
import { SparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomial';
import { Vector } from '../../src/core/classes/vector/Vector';
import { message } from '../../src/core/errors';
import { Settings } from '../../src/core/Settings';
import { definiteIntegrateNative } from '../../src/math/defint/defintNative';
import { factorial } from '../../src/math/math';

const allowedLiteralThrows = [
	['core/classes/parser/scripting/controlFlow.ts', 'throw new ReturnSignal(x)'],
	['core/classes/parser/scripting/controlFlow.ts', 'throw new NullSignal()'],
] as const;

function collectTypeScriptFiles(directory: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory)) {
		const file = join(directory, entry);
		if (statSync(file).isDirectory()) {
			files.push(...collectTypeScriptFiles(file));
		} else if (file.endsWith('.ts')) {
			files.push(file);
		}
	}
	return files;
}

function normalizeThrow(statement: string): string {
	return statement.replace(/\s+/g, ' ').trim();
}

describe('localized user-facing errors', () => {
	const previousLanguage = Settings.LANGUAGE;

	afterEach(() => {
		Settings.LANGUAGE = previousLanguage;
	});

	it('routes arithmetic and parser-function errors through the selected language', () => {
		Settings.LANGUAGE = 'spa';

		expect(() => multiply(Expression.Number(0), Expression.Inf())).toThrow(
			message('infinityTimesZero')
		);

		const functionName = 'localization_probe_missing_function';
		expect(() => callFunction(functionName, [])).toThrow(
			message('unsupportedFunction', { function: functionName })
		);
	});

	it('routes aggregate and range validation through the selected language', () => {
		Settings.LANGUAGE = 'fra';

		const vector = new Vector([Expression.Number(1)]);
		expect(() => vector.__get__([2])).toThrow(
			message('indexOutOfBounds', {
				index: '2',
				type: 'Vector',
				length: '1',
			})
		);

		expect(() => DecimalSet.range(0, 1, 0)).toThrow(message('rangeStepNonzero'));
	});

	it('routes modular factorization preconditions through the selected language', () => {
		Settings.LANGUAGE = 'spa';
		const polynomial = ModularSparsePolynomial.variable(1, 4n, 0);

		expect(() => factorSquareFreeUnivariateFiniteField(polynomial, 0)).toThrow(
			message('polyRequires', {
				operation: 'Modular factorization',
				requirement: message('polyReqPrimeModulus'),
			})
		);
	});

	it('routes public polynomial and assumption validation through the selected language', () => {
		Settings.LANGUAGE = 'deu';

		expect(() => new SparsePolynomial(-1)).toThrow(
			message('sparseVariableCountInvalid')
		);
		expect(() => Assumption.parse('')).toThrow(
			message('invalidAssumption', { input: '' })
		);
	});

	it('routes public factorial domain errors through the selected language', () => {
		Settings.LANGUAGE = 'spa';

		expect(() => factorial(Expression.Number(-1))).toThrow(
			message('factorialNegativeUndefined')
		);
	});

	it('routes definite-integration failures through the selected language', () => {
		Settings.LANGUAGE = 'ita';

		expect(() =>
			definiteIntegrateNative(x => x, 0, 1, {
				maxEvals: 0,
			})
		).toThrow(message('defintMaxEvals', { max: '0' }));
	});

	it('keeps literal throws limited to reviewed internal control-flow and algorithm diagnostics', () => {
		const sourceRoot = resolve(__dirname, '../../src');
		const unmatched = allowedLiteralThrows.map(([file, fragment]) => ({ file, fragment }));
		const unexpected: string[] = [];

		for (const sourceFile of collectTypeScriptFiles(sourceRoot)) {
			const source = readFileSync(sourceFile, 'utf8');
			const file = relative(sourceRoot, sourceFile).replace(/\\/g, '/');
			for (const match of source.matchAll(/throw\s+new\s+[\s\S]*?;/g)) {
				const statement = normalizeThrow(match[0]);
				if (statement.includes('message(')) {
					continue;
				}

				const index = unmatched.findIndex(
					allowed => allowed.file === file && statement.includes(allowed.fragment)
				);
				if (index >= 0) {
					unmatched.splice(index, 1);
				} else {
					unexpected.push(`${file}: ${statement}`);
				}
			}
		}

		expect(unexpected).toEqual([]);
		expect(unmatched).toEqual([]);
	});

	it('keeps direct ErrorMessages access inside the localization helper', () => {
		const sourceRoot = resolve(__dirname, '../../src');
		const bypasses: string[] = [];

		for (const sourceFile of collectTypeScriptFiles(sourceRoot)) {
			const file = relative(sourceRoot, sourceFile).replace(/\\/g, '/');
			if (file === 'core/errors.ts') {
				continue;
			}
			const source = readFileSync(sourceFile, 'utf8');
			if (source.includes('ErrorMessages[')) {
				bypasses.push(file);
			}
		}

		expect(bypasses).toEqual([]);
	});
});
