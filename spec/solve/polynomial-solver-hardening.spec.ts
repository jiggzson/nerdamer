import Decimal from 'decimal.js';

import { Complex } from '../../src/core/classes/complex/Complex';
import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';

const hardCases = [
	{
		name: 'Wilkinson degree 10',
		input:
			'x^10 - 55*x^9 + 1320*x^8 - 18150*x^7 + 157773*x^6 - 902055*x^5 + 3416930*x^4 - 8409500*x^3 + 12753576*x^2 - 10628640*x + 3628800',
		degree: 10,
	},
	{
		name: 'Wilkinson degree 15',
		input:
			'x^15 - 120*x^14 + 6580*x^13 - 218400*x^12 + 4899620*x^11 - 78302880*x^10 + 928095740*x^9 - 8207628000*x^8 + 54631129500*x^7 - 273872932800*x^6 + 1029921309600*x^5 - 2895809952000*x^4 + 6010803902400*x^3 - 8892185702400*x^2 + 8707129344000*x - 3556874280960',
		degree: 15,
	},
	{
		name: 'high multiplicity root',
		input: '(x - 1)^8',
		degree: 8,
	},
	{
		name: 'two clustered multiplicities',
		input: '(x - 1)^5 * (x + 1)^4',
		degree: 9,
	},
	{
		name: 'near-multiple root',
		input: '(x - 1)^5 * (x - 1.000001)^3',
		degree: 8,
	},
	{
		name: 'tightly clustered complex roots',
		input: '((x - (1+0.0001i))*(x - (1-0.0001i)))^3',
		degree: 6,
	},
	{
		name: 'roots spanning a large magnitude range',
		input: '(x - 1e-6)*(x - 1e-3)*(x - 1)*(x - 1e3)*(x - 1e6)*(x + 2)',
		degree: 6,
	},
	{
		name: 'near-cancellation coefficients',
		input: 'x^8 - 1e8*x^4 + 1',
		degree: 8,
	},
	{
		name: 'sparse high-degree trinomial',
		input: 'x^17 + x + 1',
		degree: 17,
	},
	{
		name: 'almost symmetric with a small perturbation',
		input: 'x^12 + 6*x^10 + 15*x^8 + 20*x^6 + 15*x^4 + 6*x^2 + 1 + 1e-10*x',
		degree: 12,
	},
] as const;

describe('PolynomialSolver hardening regressions', () => {
	// Regression: Nerdamer 2.0 issue #32
	it.each(hardCases)('retains every numerically validated root for $name', ({ input, degree }) => {
		const roots = new PolynomialSolver(input, 'x').validatedRoots(false);

		expect(roots).toHaveLength(degree);
		for (const root of roots) {
			expect(root.re.isFinite()).toBe(true);
			expect(root.im.isFinite()).toBe(true);
		}
	});
});


describe('Exact complex polynomial multiplicities', () => {
	it('recovers a repeated complex root without numerical splitting', () => {
		const roots = new PolynomialSolver('(x-(1+i))^4', 'x').validatedRoots(false);
		const expected = new Complex(new Decimal(1), new Decimal(1));

		expect(roots).toHaveLength(4);
		for (const root of roots) {
			expect(root.minus(expected).abs().lt('1e-20')).toBe(true);
		}
	});

	it('keeps closely separated exact complex roots and their multiplicities', () => {
		const roots = new PolynomialSolver(
			'(x-(1+i))^3*(x-(1000001/1000000+i))^2',
			'x'
		).validatedRoots(false);
		const first = new Complex(new Decimal(1), new Decimal(1));
		const second = new Complex(new Decimal('1.000001'), new Decimal(1));

		expect(roots).toHaveLength(5);
		expect(roots.filter(root => root.minus(first).abs().lt('1e-20'))).toHaveLength(3);
		expect(roots.filter(root => root.minus(second).abs().lt('1e-20'))).toHaveLength(2);
	});

	it('preserves close exact conjugate roots with multiplicity three', () => {
		const roots = new PolynomialSolver(
			'((x-(1+i/10000))*(x-(1-i/10000)))^3',
			'x'
		).validatedRoots(false);
		const upper = new Complex(new Decimal(1), new Decimal('0.0001'));
		const lower = new Complex(new Decimal(1), new Decimal('-0.0001'));

		expect(roots).toHaveLength(6);
		expect(roots.filter(root => root.minus(upper).abs().lt('1e-20'))).toHaveLength(3);
		expect(roots.filter(root => root.minus(lower).abs().lt('1e-20'))).toHaveLength(3);
	});
});
