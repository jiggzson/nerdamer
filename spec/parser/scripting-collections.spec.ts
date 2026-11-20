import { Expression } from '../../src/api/core';
import {
	ValuesSet,
	Vector,
	append,
	difference,
	intersection,
	intersects,
	isSubset,
	union,
} from '../../src/api/structures';
import nerdamer from '../../src/index';

// Assignments in block() are global, so each test starts clean.
afterEach(() => {
	nerdamer.clearVars();
	nerdamer.clearFunctions();
});

describe('append', () => {
	it.each([
		['append([1,2],3)', '[1, 2, 3]'],
		['append([],3)', '[3]'],
		// A vector is added as one element.
		['append([[1,2]],[3,4])', '[[1, 2], [3, 4]]'],
		['append([x],y^2)', '[x, y^2]'],
		// The original vector isn't changed.
		['block(v:[1],w:append(v,2),[v,w])', '[[1], [1, 2]]'],
		// A list can grow in a loop.
		['block(s:[],each([3,1,2],x,s:append(s,x^2)),s)', '[9, 1, 4]'],
		// An unknown vector keeps the call.
		['append(v,3)', 'append(v, 3)'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it.each([
		['append({1,2},3)', 'Expected Vector! Received ValuesSet.'],
		['append(matrix([1,2]),3)', 'Expected Vector! Received Matrix.'],
		['append(5,3)', 'Expected Vector! Received Expression.'],
		['append(v,[1])', 'Expected Vector! Received Expression.'],
	])('%s is an error', (input, error) => {
		expect(() => nerdamer(input)).toThrow(error);
	});
});

describe('union, intersection and difference', () => {
	it.each([
		['union({1,2},{2,3})', '{1, 2, 3}'],
		['union({1},{2},{3,1})', '{1, 2, 3}'],
		['union({[1,2]},{[1,2],[3,4]})', '{[1, 2], [3, 4]}'],
		['intersection({1,2,3},{2,3,4})', '{2, 3}'],
		['intersection({1,2},{3})', '{}'],
		['difference({1,2,3},{2})', '{1, 3}'],
		['block(r:{},each([1,2,1],x,r:union(r,{x})),r)', '{1, 2}'],
		['f(A):=union(A,{1}); f({2})', '{2, 1}'],
		// Unknown sets keep the call.
		['union(A,B)', 'union(A, B)'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it.each([
		['union({1},[1,2])', 'union requires sets! Received Vector. Write a set as {1,2,3}.'],
		['union(A,{1})', 'union requires sets! Received Expression. Write a set as {1,2,3}.'],
		[
			'difference({1},2)',
			'difference requires sets! Received Expression. Write a set as {1,2,3}.',
		],
		['union({1})', 'union requires a minimum of 2 arguments but 1 provided!'],
	])('%s is an error', (input, error) => {
		expect(() => nerdamer(input)).toThrow(error);
	});

	it('has JavaScript forms that take strings', () => {
		expect(nerdamer.union('{1,2}', '{2,3}').text()).toBe('{1, 2, 3}');
		expect(nerdamer.intersection('{1,2}', '{2,3}', '{2}').text()).toBe('{2}');
		expect(nerdamer.difference('{1,2}', '{2}').text()).toBe('{1}');
		expect(nerdamer.append('[1,2]', '3').text()).toBe('[1, 2, 3]');
	});

	it('can be imported from nerdamer/structures', () => {
		const a = new ValuesSet([Expression.create(1), Expression.create(2)]);
		const b = new ValuesSet([Expression.create(2), Expression.create(3)]);
		expect(union(a, b).text()).toBe('{1, 2, 3}');
		expect(intersection(a, b).text()).toBe('{2}');
		expect(difference(a, b).text()).toBe('{1}');
		expect(append(Vector.create([1, 2]), Expression.create(3)).text()).toBe('[1, 2, 3]');
	});
});

describe('intersects and issubset', () => {
	it.each([
		['intersects({1,2},{2,3})', '1'],
		['intersects({1,2},{3,4})', '0'],
		['intersects({},{1})', '0'],
		['intersects({[1,2]},{[1,2],3})', '1'],
		['issubset({1},{1,2})', '1'],
		['issubset({1,2},{1,2})', '1'],
		['issubset({1,3},{1,2})', '0'],
		['issubset({},{1})', '1'],
		// The order of the arguments matters for issubset, but not for intersects.
		['issubset({1,2},{1})', '0'],
		['intersects({2,3},{1,2})', '1'],
		// The results agree with the set comparisons.
		['issubset({a,b},{a,b,c}) == ({a,b} <= {a,b,c})', '1'],
		['intersects({a},{b}) == (intersection({a},{b}) == {})', '0'],
		// Unknown sets keep the call.
		['intersects(A,B)', 'intersects(A, B)'],
		['issubset(A,B)', 'issubset(A, B)'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it.each([
		['intersects({1},[1,2])', 'intersects requires sets! Received Vector. Write a set as {1,2,3}.'],
		['issubset(A,{1})', 'issubset requires sets! Received Expression. Write a set as {1,2,3}.'],
		['intersects({1})', 'intersects requires a minimum of 2 arguments but 1 provided!'],
		['issubset({1},{1},{1})', 'issubset allows a maximum of 2 arguments but 3 provided!'],
	])('%s is an error', (input, error) => {
		expect(() => nerdamer(input)).toThrow(error);
	});

	it('has JavaScript forms that take strings', () => {
		expect(nerdamer.intersects('{1,2}', '{2,3}').text()).toBe('1');
		expect(nerdamer.issubset('{1}', '{1,2}').text()).toBe('1');
	});

	it('keeps is_subset, the 1.x name, with a deprecation warning', () => {
		nerdamer.clearWarnings();
		try {
			expect(nerdamer('is_subset({1},{1,2})').text()).toBe('1');
			expect(nerdamer('is_subset({1,2},{1})').text()).toBe('0');
			// An unknown set keeps the call under the new name.
			expect(nerdamer('is_subset(A,B)').text()).toBe('issubset(A, B)');
			expect(nerdamer.is_subset('{1}', '{1,2}').text()).toBe('1');
			const warning = { code: 'api.deprecatedFunction', message: 'is_subset is deprecated; use issubset instead.' };
			expect(nerdamer.getWarnings()).toEqual([warning, warning, warning, warning]);

			// The new name gives no warning.
			nerdamer.clearWarnings();
			nerdamer('issubset({1},{1,2})');
			nerdamer.issubset('{1}', '{1,2}');
			expect(nerdamer.getWarnings()).toEqual([]);
		} finally {
			nerdamer.clearWarnings();
		}
	});

	it('can be imported from nerdamer/structures', () => {
		const a = new ValuesSet([Expression.create(1)]);
		const b = new ValuesSet([Expression.create(1), Expression.create(2)]);
		expect(intersects(a, b).text()).toBe('1');
		expect(isSubset(a, b).text()).toBe('1');
		expect(isSubset(b, a).text()).toBe('0');
	});
});

describe('A function name before a closing bracket or comma', () => {
	// The name isn't a call without brackets, as `sin x` is.
	it.each([
		['roots:2; roots\n', '2'],
		['sin:2; sin ', '2'],
		['[sin ]', '[sin]'],
		['[sin , cos]', '[sin, cos]'],
		['block(a:sin , a)', 'sin'],
		// Calls without brackets still work.
		['sin x\n', 'sin(x)'],
		['[sin x, cos x]', '[sin(x), cos(x)]'],
		['cos x * cos x', 'cos(x)^2'],
	])('%j gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});
});
