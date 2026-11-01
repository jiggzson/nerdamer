import nerdamer from '../../src';
import {
	Expression,
	UnexpectedDataType,
	UnexpectedInputError,
	UnsupportedOperationError,
} from '../../src/api/core';
import { SolutionSet } from '../../src/api/solve';
import { Vector } from '../../src/api/structures';
import { Parser } from '../../src/core/classes/parser/Parser';
import { callFunction } from '../../src/core/classes/parser/operations/functions';

describe('realsolutions notation', () => {
	it('filters real roots without comparing complex roots against real bounds', () => {
		const result = nerdamer('realsolutions(solve(x^6-1,x),-10,10)');
		expect(SolutionSet.isSolutionSet(result)).toBe(true);
		if (!SolutionSet.isSolutionSet(result)) {
			throw new Error('Expected finite real solutions');
		}
		expect(result.count()).toBe(2);
		expect(result.has(Expression.create('-1'))).toBe(true);
		expect(result.has(Expression.create('1'))).toBe(true);
	});

	it('rejects unsupported notation inputs rather than returning a symbolic placeholder', () => {
		for (const input of [
			'realsolutions(2,-10,10)',
			'realsolutions(matrix([1,2],[3,4]),-10,10)',
			'realsolutions(solveeqs([x+y=3,x-y=1]),-10,10)',
		]) {
			expect(() => nerdamer(input)).toThrow(UnexpectedDataType);
		}
		expect(() => nerdamer('realsolutions(solve(sin(x),x),-k,k)'))
			.toThrow(UnsupportedOperationError);
	});


	it('selects distinct values of one variable within inclusive bounds', () => {
		const selected = nerdamer('realsolutions([{x=>-2,y=>10},{x=>0,y=>20},{x=>0,y=>21},{x=>2,y=>30},{x=>3,y=>40}],x,-2,2)');
		expect(SolutionSet.isSolutionSet(selected)).toBe(true);
		if (!SolutionSet.isSolutionSet(selected)) {
			throw new Error('Expected real coordinate solutions');
		}
		expect(selected.solutionForm).toBe('finite');
		expect(selected.count()).toBe(3);
		for (const value of [-2, 0, 2]) {
			expect(selected.has(Expression.create(value))).toBe(true);
		}
		expect(selected.has(Expression.create(3))).toBe(false);
	});

	it('returns independent coordinate solutions without changing the original assignments', () => {
		const source = nerdamer('[{x=>1,y=>7},{x=>3,y=>9}]');
		expect(Vector.isVector(source)).toBe(true);
		const before = source.text();
		const selected = callFunction('realsolutions', [
			source, Expression.Variable('x'), Expression.create(0), Expression.create(2),
		]);
		expect(SolutionSet.isSolutionSet(selected)).toBe(true);
		if (!SolutionSet.isSolutionSet(selected)) {
			throw new Error('Expected a SolutionSet of x values');
		}
		expect(selected.count()).toBe(1);
		expect(selected.has(Expression.create(1))).toBe(true);
		selected.add(Expression.create(99));
		expect(source.text()).toBe(before);
		expect(source.text()).toContain('y => 7');
	});

	it('selects the requested solveeqs coordinate without generating new roots', () => {
		const x = nerdamer('realsolutions(solveeqs([x+y=3,x-y=1]),x,1,3)');
		const y = nerdamer('realsolutions(solveeqs([x+y=3,x-y=1]),y,1,3)');
		const outside = nerdamer('realsolutions(solveeqs([x+y=3,x-y=1]),x,3,4)');

		for (const result of [x, y, outside]) {
			expect(SolutionSet.isSolutionSet(result)).toBe(true);
		}
		if (!SolutionSet.isSolutionSet(x) ||
			!SolutionSet.isSolutionSet(y) ||
			!SolutionSet.isSolutionSet(outside)) {
			throw new Error('Expected a SolutionSet for each coordinate');
		}
		expect(x.text()).toBe('{2}');
		expect(y.text()).toBe('{1}');
		expect(outside.count()).toBe(0);

		const empty = nerdamer('realsolutions([],x,-1,1)');
		expect(SolutionSet.isSolutionSet(empty)).toBe(true);
		if (!SolutionSet.isSolutionSet(empty)) {
			throw new Error('Expected an empty SolutionSet');
		}
		expect(empty.count()).toBe(0);
	});

	it('rejects invalid variable selectors, incompatible members, and unresolved coordinate values', () => {
		for (const input of [
			'realsolutions([{x=>1,y=>2}],2,-2,2)',
			'realsolutions([{x=>1,y=>2}],x^2,-2,2)',
			'realsolutions([{x=>1,y=>2}],z,-2,2)',
		]) {
			expect(() => nerdamer(input)).toThrow(UnexpectedInputError);
		}

		for (const input of [
			'realsolutions([1,2],x,-2,2)',
			'realsolutions([{x=>[1,2]}],x,-2,2)',
			'realsolutions(solve(x^2-1,x),x,-2,2)',
		]) {
			expect(() => nerdamer(input)).toThrow(UnexpectedDataType);
		}

		for (const input of [
			'realsolutions([{x=>a,y=>2}],x,-2,2)',
			'realsolutions([{x=>_n,y=>2}],x,-2,2)',
		]) {
			expect(() => nerdamer(input)).toThrow(UnsupportedOperationError);
		}
		expect(() => nerdamer('realsolutions([{x=>1,y=>2}],x,3,-3)'))
			.toThrow(RangeError);
		expect(() => nerdamer('realsolutions([{x=>1,y=>2}],x,-k,k)'))
			.toThrow(UnsupportedOperationError);
		expect(() => nerdamer('realsolutions(matrix([1,2],[3,4]),x,-2,2)'))
			.toThrow(UnexpectedDataType);
	});

	it('preserves deferred solve-to-realsolutions notation without executing a symbolic placeholder', () => {
		const previous = Parser.get('DEFER_SIMPLIFICATION');
		let deferred: ReturnType<typeof nerdamer>;
		try {
			Parser.set('DEFER_SIMPLIFICATION', true);
			deferred = nerdamer('realsolutions(solve(sin(x),x),-10,10)');
			expect(Expression.isExpression(deferred)).toBe(true);
			if (Expression.isExpression(deferred)) {
				expect(deferred.isFunction('realsolutions')).toBe(true);
			}
		} finally {
			Parser.set('DEFER_SIMPLIFICATION', previous);
		}
		const resolved = nerdamer(deferred.text());
		expect(SolutionSet.isSolutionSet(resolved)).toBe(true);
		if (!SolutionSet.isSolutionSet(resolved)) {
			throw new Error('Expected deferred solve notation to resolve to a SolutionSet');
		}
		expect(resolved.count()).toBe(7);
	});
});
