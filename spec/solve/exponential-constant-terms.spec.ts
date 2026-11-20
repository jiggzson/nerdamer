import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { solve } from '../../src/solve/solve';

// An exponential plus several terms free of x used to miss the exponential inversion, which
// only took one other term, so solve(e^x-1-i,x) returned {}.
describe('Exponentials with several constant terms', () => {
	it.each([
		['e^x-(1+i)', '{(1/2)*log(2)+i*((1/4)*pi+2*pi*_n)}'],
		['e^x-1-i', '{(1/2)*log(2)+i*((1/4)*pi+2*pi*_n)}'],
		['e^x+1+i', '{(1/2)*log(2)+i*((-3/4)*pi+2*pi*_n)}'],
		['2^x-1-i', '{1/2+log(2)^-1*((1/4)*pi+2*pi*_n)*i}'],
		['e^x+sqrt(2)+1', '{log(2^(1/2)+1)+i*(pi+2*pi*_n)}'],
		['e^x-pi-1', '{log(1+pi)}'],
		['e^x-a-b', '{log(a+b)}'],
		['3*e^x-a+1', '{log((1/3)*(-1+a))}'],
	])('solves %s', (source, expected) => {
		expect(solve(source, 'x').text()).toBe(expected);
	});

	it.each([['e^x-1-i'], ['e^x+1+i'], ['2^x-1-i'], ['e^x+sqrt(2)+1'], ['e^x-pi-1']])(
		'gives roots of %s for every sampled index',
		source => {
			const root = solve(source, 'x').elements[0];
			for (const n of [-2, -1, 0, 1, 2]) {
				const value = root.subst('_n', n);
				const residual = Expression.create(source).subst('x', value).evaluate().expand();
				expect(residual.isNearlyZero()).toBe(true);
			}
		}
	);

	it('leaves terms with x to the other strategies', () => {
		expect(solve('e^x+x-1', 'x').text()).toBe('{0}');
		expect(solve('e^x+e^(2*x)-2', 'x').text()).toBe('{0}');
	});
});
