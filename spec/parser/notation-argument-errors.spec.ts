'use strict';

import '../helpers/registerNerdamerFunctions';
import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { MathError, UnexpectedDataType } from '../../src/core/errors';
import { sampleStandardDeviation, sampleVariance } from '../../src/statistics';

describe('variables() on every kind of value', () => {
	it.each([
		['vars([x,y^2])', '[x, y]'],
		['vars(x=y)', '[x, y]'],
		['vars(matrix([a,b],[c,x]))', '[a, b, c, x]'],
		['vars({z,1,y})', '[y, z]'],
		['vars(x+y)', '[x, y]'],
	])('%s gives %s', (source, expected) => {
		expect(nerdamer(source).text()).toEqual(expected);
	});

	it('is a method on vectors, matrices, sets and equations', () => {
		expect(nerdamer('[x,y^2]').variables()).toEqual(['x', 'y']);
		expect(nerdamer('x=y').variables()).toEqual(['x', 'y']);
		expect(nerdamer('matrix([b,a],[a,1])').variables()).toEqual(['b', 'a']);
		expect(nerdamer('{x,2}').variables()).toEqual(['x']);
	});
});

describe('groebner and solveeqs given one item', () => {
	it.each([
		['groebner(x^2+y)', '[x^2+y]'],
		['groebner([x^2+y,x*y-1],[x,y])', '[y^2+x, 1+y^3]'],
		['groebner([x^2+y,x*y-1],[y,x])', '[y+x^2, 1+x^3]'],
		['solveeqs(x=1)', '[{x => 1}]'],
		['solveeqs(x^2-4)', '[{x => 2}, {x => -2}]'],
	])('%s gives %s', (source, expected) => {
		expect(nerdamer(source).text()).toEqual(expected);
	});

	it('works the same way in JavaScript', () => {
		expect(nerdamer.solveeqs('x=1').text()).toEqual('[{x => 1}]');
		expect(nerdamer.groebner('x^2+y').text()).toEqual('[x^2+y]');
	});
});

describe('imatrix sizes', () => {
	it('rejects a negative size and a structure', () => {
		expect(() => nerdamer('imatrix(-1)')).toThrow(MathError);
		expect(() => nerdamer('imatrix(-1)')).toThrow('imatrix needs a size of 0 or more! Received -1.');
		expect(() => nerdamer('imatrix([1,2,3])')).toThrow(UnexpectedDataType);
		expect(() => nerdamer('imatrix([1,2,3])')).toThrow('Expression expected!. Received Vector!');
	});

	it('keeps the other sizes as they were', () => {
		expect(nerdamer('imatrix(2)').text()).toEqual('matrix([1, 0], [0, 1])');
		expect(nerdamer('imatrix(0)').text()).toEqual('matrix()');
		expect(nerdamer('imatrix(x)').text()).toEqual('imatrix(x)');
	});
});

describe('nerdamer.matrix with string rows', () => {
	it('parses each row', () => {
		expect(nerdamer.matrix('[1,2]', '[3,4]').text()).toEqual('matrix([1, 2], [3, 4])');
		expect(nerdamer.matrix([1, 2], [3, 4]).text()).toEqual('matrix([1, 2], [3, 4])');
	});
});

describe('sample variance of one value', () => {
	it.each(['smpvar', 'smpstdev'])('%s(5) says it needs two values', name => {
		expect(() => nerdamer(`${name}(5)`)).toThrow(MathError);
		expect(() => nerdamer(`${name}(5)`)).toThrow(`${name} needs at least two values!`);
	});

	it('names the function that was called, in every form', () => {
		expect(() => nerdamer('smpvar([5])')).toThrow('smpvar needs at least two values!');
		expect(() => nerdamer.smpstdev(5)).toThrow('smpstdev needs at least two values!');
		expect(() => sampleVariance(5)).toThrow('sampleVariance needs at least two values!');
		expect(() => sampleStandardDeviation(5)).toThrow('sampleStandardDeviation needs at least two values!');
	});

	it('still computes with two or more values', () => {
		expect(nerdamer('smpvar(1,2,3)').text()).toEqual('1');
		expect(nerdamer('variance(5)').text()).toEqual('0');
	});
});

// Every Notation function, called with unusual arguments, either works or throws one
// of the library's own errors, never a TypeError from a missing method.
describe('Notation functions given unusual arguments', () => {
	// Calls such as while(2,3) loop until the iteration guard stops them. A low limit
	// still reaches the guard, without running a million iterations each time.
	let previousLoopLimit: ReturnType<typeof Parser.get>;

	beforeAll(() => {
		previousLoopLimit = Parser.get('MAX_LOOP_ITERATIONS');
		Parser.set('MAX_LOOP_ITERATIONS', 100);
	});

	afterAll(() => {
		Parser.set('MAX_LOOP_ITERATIONS', previousLoopLimit);
	});

	it('never fail with an internal error', () => {
		const names = nerdamer.functions().system;
		const argumentSets = ['', 'x', '2', '-3', '0', '1/2', 'x^2+1', 'x^2+1,x', 'x,y', '2,3', '[1,2,3]', 'matrix([1,2],[3,4])', '{1,2}', 'x=1', 'i'];
		const internal = /is not a function|Cannot read prop|of undefined|is not iterable/;
		const failures: string[] = [];
		for (const name of names) {
			for (const args of argumentSets) {
				try {
					nerdamer(`${name}(${args})`);
				} catch (error) {
					if (error instanceof TypeError || internal.test((error as Error).message)) {
						failures.push(`${name}(${args}): ${(error as Error).message}`);
					}
				}
			}
		}
		expect(names.length).toBeGreaterThan(100);
		expect(failures).toEqual([]);
	});
});
