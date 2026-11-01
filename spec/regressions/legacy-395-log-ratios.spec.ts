import nerdamer from '../../src/index';

describe('legacy #395 exact logarithmic ratios', () => {
	// Whole powers with a shared positive integer base reduce exactly.
	it('reduces base-ten logarithm combinations after simplification', () => {
		expect(nerdamer('log10(25)+log10(400)').simplify().text()).toEqual('4');
		expect(nerdamer('log10(20)-log10(1/5)').simplify().text()).toEqual('2');
		expect(nerdamer('log10(8)+log10(625)-log10(5)').simplify().text()).toEqual('3');
	});

	it('reduces proportional prime multiplicities in logarithm ratios', () => {
		expect(nerdamer('log(81)/log(243)').simplify().text()).toEqual('4/5');
		expect(nerdamer('log(27)/log(sqrt(3))').simplify().text()).toEqual('6');
	});

	it('preserves unrelated and unknown-sign logarithms', () => {
		const unrelated = nerdamer('log(12)/log(18)');
		expect(unrelated.simplify().eq(unrelated)).toBe(true);
		const symbolic = nerdamer('log(x)/log(y)');
		expect(symbolic.simplify().eq(symbolic)).toBe(true);
	});
});
