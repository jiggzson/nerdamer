import nerdamer from '../../src/index';

describe('legacy #395 logarithmic equation inversion', () => {
	// A constant change-of-base factor must not hide the logarithm from the solver.
	it('solves a base-ten logarithm of an affine expression', () => {
		expect(nerdamer('solve(log10(3*x-2)=2,x)').text()).toEqual('{34}');
	});

	it('solves logarithmic equations with rational arguments', () => {
		expect(nerdamer('solve(log10((2-x)/(3+4*x))=-1,x)').text()).toEqual('{17/14}');
	});

	it('preserves the ordinary natural logarithm inversion', () => {
		expect(nerdamer('solve(log(x)=1,x)').text()).toEqual('{e}');
	});
});
