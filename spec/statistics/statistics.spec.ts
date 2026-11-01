import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import {
	mean,
	median,
	mode,
	sampleStandardDeviation,
	sampleVariance,
	stdev,
	variance,
	zscore,
} from '../../src/statistics';

describe('Statistics', () => {
	const expectParsedExpression = (source: string, expected: string) => {
		const actual = nerdamer(source);
		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			expect(actual.eq(expected)).toBe(true);
		}
	};

	it('restores the legacy mean and median functions', () => {
		expect(mean(1, 2, 3, 4).eq('5/2')).toBe(true);
		expect(median(1, 4, 2, 3).eq('5/2')).toBe(true);
		expectParsedExpression('mean([1,2,3,4])', '5/2');
		expectParsedExpression('median([1,4,2,3])', '5/2');
	});

	it('restores legacy mode behavior including unresolved ties', () => {
		expect(mode('r', 'r', 'r', 'r').eq('r')).toBe(true);
		expect(nerdamer('mode(1,2)').text()).toEqual('mode(1, 2)');
		expect(nerdamer('mode(1,2,3,1,2)').text()).toEqual('mode(1, 2)');
		expect(nerdamer('mode(1,1,2)').text()).toEqual('1');
		expect(nerdamer('mode(a,a,b,c,a,b,d)').text()).toEqual('a');
		expect(nerdamer('mode(x,r+1,21,tan(x),r+1)').text()).toEqual('1+r');
		expect(nerdamer('mode(x,r+1,21,tan(x),r+1,x)').text()).toEqual('mode(1+r, x)');
	});

	it('computes population and sample variance and standard deviation', () => {
		expect(variance(1, 2, 3, 4).eq('5/4')).toBe(true);
		expect(sampleVariance(1, 2, 3, 4).eq('5/3')).toBe(true);
		expect(stdev(1, 2, 3, 4).sq().eq('5/4')).toBe(true);
		expect(sampleStandardDeviation(1, 2, 3, 4).sq().eq('5/3')).toBe(true);
		expectParsedExpression('smpvar(1,2,3,4)', '5/3');
		const sampleDeviation = nerdamer('smpstdev(1,2,3,4)');
		expect(Expression.isExpression(sampleDeviation)).toBe(true);
		if (Expression.isExpression(sampleDeviation)) {
			expect(sampleDeviation.sq().eq('5/3')).toBe(true);
		}
	});

	it('computes z-scores', () => {
		expect(zscore(3, 2, '1/2').eq(2)).toBe(true);
		expectParsedExpression('zscore(3,2,1/2)', '2');
	});

	it('preserves legacy algebraic statistics for complex values', () => {
		expect(mean('1+i', '3-i').eq(2)).toBe(true);
		expect(variance('1+i', '3-i').eq('-2*i')).toBe(true);
		expectParsedExpression('mode(1+i,1+i,2-i)', '1+i');

		const complexMedian = median('1+i', '2-i');
		expect(complexMedian.isFunction('median')).toBe(true);
		expect(complexMedian.getArguments()).toHaveLength(2);
	});

	it('keeps symbolic medians symbolic when values cannot be ordered', () => {
		const result = median('a', 'b');
		expect(result.isFunction('median')).toBe(true);
		expect(result.getArguments().map(value => value.text()).sort()).toEqual(['a', 'b']);
	});

	it('accepts Vector input through Nerdamer notation', () => {
		const result = nerdamer('variance([1,2,3,4])');
		expect(Expression.isExpression(result)).toBe(true);
		if (Expression.isExpression(result)) {
			expect(result.eq('5/4')).toBe(true);
		}
	});
});
