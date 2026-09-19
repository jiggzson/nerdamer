import nerdamer from '../../src';
import { Expression, MathError } from '../../src/api/core';
import { solve, solveSystem, SolutionSet } from '../../src/api/solve';
import {
	Collection,
	cross,
	Dictionary,
	Matrix,
	ValuesSet,
	Vector,
} from '../../src/api/structures';

describe('public result ergonomics', () => {
	it('returns an Expression-oriented SolutionSet that can be inspected without mutation', () => {
		const roots: SolutionSet = solve('x^2-1', 'x');
		const before = roots.text();
		const seen: string[] = [];

		const returned = roots.each(root => {
			seen.push(root.text());
		});

		expect(returned).toBe(roots);
		expect(roots.text()).toBe(before);
		expect(seen.sort()).toEqual(['-1', '1']);

		const first: Expression | undefined = roots.at(0);
		expect(first).toBeDefined();

		const asArray: Expression[] = roots.toArray();
		expect(asArray.map(root => root.text()).sort()).toEqual(['-1', '1']);

		const iterated: Expression[] = [...roots];
		expect(iterated.map(root => root.text()).sort()).toEqual(['-1', '1']);

		const visited: string[] = [];
		roots.forEach(root => {
			visited.push(root.text());
		});
		expect(visited.sort()).toEqual(['-1', '1']);
	});

	it('preserves SolutionSet ergonomics through the compatibility root API', () => {
		const roots: SolutionSet = nerdamer.solve('x^2-1', 'x');
		const seen: string[] = [];

		roots.each(root => {
			seen.push(root.text());
		});

		expect(seen.sort()).toEqual(['-1', '1']);
		expect(roots.toArray().map(root => root.text()).sort()).toEqual(['-1', '1']);
	});

	it('returns system solutions as directly usable Dictionary entities', () => {
		const systems = solveSystem(['x+y=3', 'x-y=1'], ['x', 'y']);

		expect(systems.count()).toBe(1);
		const solution = systems.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);

		if (!Dictionary.isDictionary(solution)) {
			throw new Error('Expected solveSystem() to return Dictionary entries.');
		}

		expect(solution.get('x')?.text()).toBe('2');
		expect(solution.get('y')?.text()).toBe('1');
		expect(solution.entries().map(([name, value]) => [name, value.text()])).toEqual([
			['x', '2'],
			['y', '1'],
		]);
	});

	it('returns a Vector directly for concrete Vector cross products', () => {
		const left = Vector.create([1, 0, 0]);
		const right = Vector.create([0, 1, 0]);
		const result: Vector = cross(left, right);

		expect(result.text()).toBe('[0, 0, 1]');
	});

	it('lets public Vectors inspect values without transforming them', () => {
		const vector = Vector.create(['x', 'y']);
		const before = vector.text();
		const seen: string[] = [];

		vector.each(value => {
			seen.push(value.text());
		});

		expect(vector.text()).toBe(before);
		expect(seen).toEqual(['x', 'y']);
		expect(vector.at(0)?.text()).toBe('x');
		expect(vector.at(20)).toBeUndefined();
		expect(vector.toArray().map(value => value.text())).toEqual(['x', 'y']);
		expect([...vector].map(value => value.text())).toEqual(['x', 'y']);

		const visited: string[] = [];
		vector.forEach(value => {
			visited.push(value.text());
		});
		expect(visited).toEqual(['x', 'y']);
	});

	it('lets public Matrices inspect cells and rejects invalid coordinates deliberately', () => {
		const matrix = new Matrix([1, 2], [3, 4]);
		const before = matrix.text();
		const seen: string[] = [];

		matrix.each((value, row, col) => {
			seen.push(`${String(row)},${String(col)}:${value.text()}`);
		});

		expect(matrix.text()).toBe(before);
		expect(seen).toEqual(['0,0:1', '0,1:2', '1,0:3', '1,1:4']);

		const direct: Expression = matrix.get(1, 0);
		const legacy: Expression = matrix.e(2, 1);
		expect(direct.text()).toBe('3');
		expect(legacy.text()).toBe('3');

		const visited: string[] = [];
		matrix.forEach((value, row, col) => {
			visited.push(`${row},${col}:${value.text()}`);
		});
		expect(visited).toEqual(['0,0:1', '0,1:2', '1,0:3', '1,1:4']);

		expect(() => matrix.get(-1, 0)).toThrow(MathError);
		expect(() => matrix.get(0, 2)).toThrow(MathError);
		expect(() => matrix.e(0, 1)).toThrow(MathError);
		expect(() => matrix.e(1, 3)).toThrow(MathError);
	});

	it('lets public ValuesSets inspect copied members without transforming them', () => {
		const set = new ValuesSet([Expression.create('x'), Expression.create('y')]);
		const before = set.text();
		const seen: string[] = [];

		set.each(value => {
			seen.push(value.text());
		});

		expect(set.text()).toBe(before);
		expect(seen).toEqual(['x', 'y']);
		expect(set.at(0)?.text()).toBe('x');
		expect(set.at(20)).toBeUndefined();
		expect(set.toArray().map(value => value.text())).toEqual(['x', 'y']);
		expect([...set].map(value => value.text())).toEqual(['x', 'y']);

		const visited: string[] = [];
		set.forEach(value => {
			visited.push(value.text());
		});
		expect(visited).toEqual(['x', 'y']);

		const nested = new ValuesSet([Vector.create(['z'])]);
		nested.each(value => {
			if (Vector.isVector(value)) {
				value.append(Expression.create('q'));
			}
		});
		expect(nested.text()).toBe('{[z]}');
	});

	it('lets public Collections use ordinary observation workflows', () => {
		const collection = new Collection([
			Expression.create('x'),
			Expression.create('y'),
		]);
		const before = collection.text();
		const seen: string[] = [];

		collection.each(value => {
			seen.push(value.text());
		});

		expect(collection.text()).toBe(before);
		expect(seen).toEqual(['x', 'y']);
		expect(collection.at(0)?.text()).toBe('x');
		expect(collection.at(20)).toBeUndefined();
		expect(collection.toArray().map(value => value.text())).toEqual(['x', 'y']);
		expect([...collection].map(value => value.text())).toEqual(['x', 'y']);

		const visited: string[] = [];
		collection.forEach(value => {
			visited.push(value.text());
		});
		expect(visited).toEqual(['x', 'y']);
	});

	it('lets public Dictionaries inspect entries without transforming them', () => {
		const dictionary = new Dictionary()
			.set('x', Expression.create(2))
			.set('y', Expression.create(3));
		const before = dictionary.text();
		const seen: string[] = [];

		dictionary.each((value, key) => {
			seen.push(`${String(key)}:${value.text()}`);
		});

		expect(dictionary.text()).toBe(before);
		expect(seen).toEqual(['x:2', 'y:3']);
		expect([...dictionary].map(([key, value]) => `${key}:${value.text()}`)).toEqual([
			'x:2',
			'y:3',
		]);

		const visited: string[] = [];
		dictionary.forEach((value, key) => {
			visited.push(`${key}:${value.text()}`);
		});
		expect(visited).toEqual(['x:2', 'y:3']);
	});
});
