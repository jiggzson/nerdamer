import { mathFunctionRegistry } from '../../src/core/dispatch';
import {
	buildParserFunctionDocumentation,
	serializeParserFunctionDocumentation,
} from '../../tools/generate-parser-docs';

describe('parser function documentation', () => {
	it('covers every system-level parser function exactly once', () => {
		const artifact = buildParserFunctionDocumentation();
		const expectedNames = Object.entries(mathFunctionRegistry)
			.filter(([, entry]) => entry.level === 'system')
			.map(([name]) => name)
			.sort();
		const documentedNames = artifact.functions.map(entry => entry.name);

		expect(documentedNames).toEqual(expectedNames);
		expect(new Set(documentedNames).size).toBe(documentedNames.length);
	});

	it('classifies every system parser entry as notation or scripting', () => {
		for (const entry of Object.values(mathFunctionRegistry)) {
			if (entry.level === 'system') {
				expect(['notation', 'scripting']).toContain(entry.usage);
			}
		}

		expect(mathFunctionRegistry.factor.usage).toBe('notation');
		expect(mathFunctionRegistry.sin.usage).toBe('notation');
		expect(mathFunctionRegistry.diff.usage).toBe('notation');
		expect(mathFunctionRegistry.solve.usage).toBe('notation');
	});

	it('marks only Nerdamer scripting entries as scripting', () => {
		const scriptingNames = Object.entries(mathFunctionRegistry)
			.filter(([, entry]) => entry.level === 'system' && entry.usage === 'scripting')
			.map(([name]) => name)
			.sort();

		expect(scriptingNames).toEqual([
			'and',
			'block',
			'break',
			'continue',
			'each',
			'evaluate',
			'for',
			'if',
			'iferror',
			'iserror',
			'let',
			'not',
			'or',
			'return',
			'while',
			'xor',
		]);
	});

	it('copies parser usage into the generated documentation', () => {
		const artifact = buildParserFunctionDocumentation();
		const byName = new Map(artifact.functions.map(entry => [entry.name, entry]));

		expect(artifact.schemaVersion).toBe(2);
		expect(byName.get('factor')?.usage).toBe('notation');
		expect(byName.get('if')?.usage).toBe('scripting');
		expect(byName.get('evaluate')?.usage).toBe('scripting');
		expect(byName.get('and')?.usage).toBe('scripting');
		expect(byName.get('iferror')?.usage).toBe('scripting');

		for (const [name, registered] of Object.entries(mathFunctionRegistry)) {
			if (registered.level === 'system') {
				expect(byName.get(name)?.usage).toBe(registered.usage);
			}
		}
	});

	it('records parser aliases without dropping accepted names', () => {
		const artifact = buildParserFunctionDocumentation();
		const byName = new Map(artifact.functions.map(entry => [entry.name, entry]));

		expect(byName.get('factorial')?.aliases).toEqual(['fact']);
		expect(byName.get('fact')?.canonicalName).toBe('factorial');
		expect(byName.get('ceil')?.aliases).toEqual(['ceiling']);
		expect(byName.get('ceiling')?.canonicalName).toBe('ceil');
	});

	it('links parser entries only to supported public direct APIs', () => {
		const artifact = buildParserFunctionDocumentation();
		const byName = new Map(artifact.functions.map(entry => [entry.name, entry]));

		expect(byName.get('factor')?.directApi).toEqual({
			package: 'nerdamer/algebra',
			name: 'factor',
		});
		expect(byName.get('diff')?.directApi).toEqual({
			package: 'nerdamer/calculus',
			name: 'diff',
		});
		expect(byName.get('solveeqs')?.directApi).toEqual({
			package: 'nerdamer/solve',
			name: 'solveSystem',
		});
		expect(byName.has('solveEquations')).toBe(false);
		expect(byName.has('solveequations')).toBe(false);
	});

	it('supports authored parser-facing parameters and examples', () => {
		const artifact = buildParserFunctionDocumentation();
		const factor = artifact.functions.find(entry => entry.name === 'factor');

		expect(factor?.syntax).toBe('factor(expression)');
		expect(factor?.summary).toBe('Factors an expression symbolically.');
		expect(factor?.parameters).toEqual([
			{ name: 'expression', description: 'Expression to factor.' },
		]);
		expect(factor?.examples).toEqual([
			{
				input: "nerdamer('factor(x^2-1)').text()",
				output: '(-1+x)*(1+x)',
			},
		]);
	});

	it('keeps generated metadata aligned with the registry', () => {
		const artifact = buildParserFunctionDocumentation();
		const byName = new Map(artifact.functions.map(entry => [entry.name, entry]));

		for (const [name, registered] of Object.entries(mathFunctionRegistry)) {
			if (registered.level === 'system') {
				expect(byName.get(name)).toMatchObject({
				minArgs: registered.minArgs,
				maxArgs: registered.maxArgs,
				equationArgs: registered.equationArgs ?? [],
				distElWise: registered.distElWise ?? false,
				deferArguments: registered.deferArguments ?? false,
				usage: registered.usage,
				registrationLevel: registered.level,
			});
			}
		}
	});

	it('serializes deterministically', () => {
		const first = serializeParserFunctionDocumentation();
		const second = serializeParserFunctionDocumentation();

		expect(first).toBe(second);
		expect(first.endsWith('\n')).toBe(true);
	});
});
