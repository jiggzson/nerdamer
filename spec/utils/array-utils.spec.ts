import {
	allEqual,
	combinedArray,
	intersection,
	isEqualArray,
	remove,
	syncSort,
} from '../../src/utils/array';

describe('Array utilities', () => {
	it('removes the first matching value in place and returns the same array', () => {
		const values = ['a', 'b', 'b', 'c'];

		const result = remove(values, 'b');

		expect(result).toBe(values);
		expect(values).toEqual(['a', 'b', 'c']);
	});

	it('leaves an array unchanged when remove cannot find the value', () => {
		const values = [1, 2, 3];

		expect(remove(values, 4)).toBe(values);
		expect(values).toEqual([1, 2, 3]);
	});

	it('compares arrays by contained values without requiring the same order', () => {
		expect(isEqualArray([1, 2, 3], [3, 1, 2])).toBe(true);
		expect(isEqualArray([1, 2], [1, 2, 3])).toBe(false);
		expect(isEqualArray([1, 2, 3], [1, 2, 4])).toBe(false);
	});

	it('combines, removes duplicates, and sorts without modifying either input', () => {
		const left = ['c', 'a', 'b'];
		const right = ['d', 'b', 'a'];

		expect(combinedArray(left, right)).toEqual(['a', 'b', 'c', 'd']);
		expect(left).toEqual(['c', 'a', 'b']);
		expect(right).toEqual(['d', 'b', 'a']);
	});

	it('returns values shared by both arrays regardless of which input is shorter', () => {
		expect(intersection([1, 2], [0, 1, 2, 3])).toEqual([1, 2]);
		expect(intersection([0, 1, 2, 3], [1, 2])).toEqual([1, 2]);
		expect(intersection([1, 2], [3, 4])).toEqual([]);
	});

	it('sorts paired arrays using the first array while preserving paired indices', () => {
		const values = [30, 10, 20];
		const labels = ['thirty', 'ten', 'twenty'];

		const [sortedValues, sortedLabels] = syncSort(values, labels, (a, b) => a - b);

		expect(sortedValues).toEqual([10, 20, 30]);
		expect(sortedLabels).toEqual(['ten', 'twenty', 'thirty']);
		expect(values).toEqual([30, 10, 20]);
		expect(labels).toEqual(['thirty', 'ten', 'twenty']);
	});

	it('recognizes empty, uniform, and mixed arrays with allEqual', () => {
		expect(allEqual([])).toBe(true);
		expect(allEqual(['x'])).toBe(true);
		expect(allEqual(['x', 'x', 'x'])).toBe(true);
		expect(allEqual(['x', 'y', 'x'])).toBe(false);
	});
});
