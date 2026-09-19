import { Polynomial } from '../../src/api/algebra';
import { Collection } from '../../src/api/structures';
import {
	inspectEntity,
	inspectExpression,
	inspectParse,
	inspectPolynomial,
} from '../../src/api/debug';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { createTypesMap } from '../../src/utils/debug';

describe('diagnostic inspector', () => {
	it('preserves token values, types, and source positions', () => {
		const tokens = inspectParse('x+2').tokens.items;
		const flat = tokens.filter(item => item.kind === 'token');

		expect(flat).toEqual([
			{ kind: 'token', value: 'x', type: 'VAR', position: 0, text: 'x' },
			{ kind: 'token', value: '+', type: 'OPR', position: 1, text: '+' },
			{ kind: 'token', value: '2', type: 'NUM', position: 2, text: '2' },
		]);
	});

	it('serializes nested scopes without circular parent references', () => {
		const inspection = inspectParse('sin(x+1)');
		const serialized = JSON.stringify(inspection);

		expect(serialized).not.toContain('"parent"');
		expect(inspection.tokens.items.some(item => item.kind === 'scope')).toBe(true);
	});

	it('preserves RPN operator ordering', () => {
		const values = inspectParse('x+2*3').rpn.items
			.filter(item => item.kind === 'token')
			.map(item => item.value);

		expect(values).toEqual(['x', '2', '3', '*', '+']);
	});

	it('uses the same bracketless-function normalization as Parser.parse', () => {
		const inspection = inspectParse('sin x');

		expect(inspection.normalizedSource).toEqual('sin(x)');
		expect(inspection.result.text).toEqual(Parser.parse('sin x').text());
		expect(inspectParse('sin(x)').normalizedSource).toEqual('sin(x)');
	});

	it('maps every Expression type to its named representation', () => {
		const types = createTypesMap();
		for (const [name, value] of Object.entries(Expression.TYPES)) {
			expect(types[value]).toBe(name);
		}
	});

	it('serializes every parser entity family to JSON-safe data', () => {
		const entities = [
			Parser.parse('x=1'),
			Parser.parse('[x,2]'),
			Parser.parse('matrix([x,1],[2,3])'),
			Parser.parse('{1,2}'),
			Parser.parse('{a=>x,b=>2}'),
			new Collection([Expression.create('x'), Expression.create('2')]),
		];

		const kinds = entities.map(entity => inspectEntity(entity).kind);
		expect(kinds).toEqual([
			'Equation',
			'Vector',
			'Matrix',
			'ValuesSet',
			'Dictionary',
			'Collection',
		]);
		expect(() => JSON.stringify(entities.map(entity => inspectEntity(entity)))).not.toThrow();
	});

	it('does not replace lazily stored Expression state while inspecting', () => {
		const expression = Expression.create('sin(x)');
		const multiplier = expression.multiplier;
		const power = expression.power;
		const args = expression.args;
		const elements = expression.elements;

		inspectExpression(expression);

		expect(expression.multiplier).toBe(multiplier);
		expect(expression.power).toBe(power);
		expect(expression.args).toBe(args);
		expect(expression.elements).toBe(elements);
	});

	it('serializes polynomial terms without exposing live power or variable arrays', () => {
		const polynomial = new Polynomial('x^2+2*x+1', ['x']);
		const inspection = inspectPolynomial(polynomial);

		expect(inspection.kind).toBe('Polynomial');
		expect(inspection.variables).toEqual(['x']);
		expect(inspection.terms.length).toBe(3);
		expect(() => JSON.stringify(inspection)).not.toThrow();
		expect(inspection.variables).not.toBe(polynomial.variables);
		expect(inspection.terms[0].powers).not.toBe(polynomial.terms[0].powers);
	});
});
