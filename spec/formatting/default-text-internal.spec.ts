import { Settings } from '../../src/core/Settings';
import { Expression } from '../../src/core/classes/expression/Expression';
import { toDefaultText, toText } from '../../src/core/classes/expression/format';

const cases = [
	'0',
	'1',
	'-1',
	'1/2',
	'0.5',
	'x',
	'-x',
	'2*x',
	'x^2',
	'x^-2',
	'x^(1/2)',
	'x^(y+1)',
	'x+y',
	'2*(x+y)',
	'x*(y+1)',
	'(x+y)^2',
	'(x+y)/(z+1)',
	'sin(x+y)',
	'sin(x)^2+cos(x)^2',
	'exp(x*z)+log(x+1)',
	'2^(x+y)',
	'3*x^2*y^-1',
	'1+x+x^2+x^7+x^1000',
	'(x+1)^5*(y+1)^4*(z+1)^3',
	'1+i',
	'3+2*i',
	'0.5*x+1.25*y',
	'(2/3)*(x+y)^(-2)',
] as const;

describe('default internal expression formatting', () => {
	for (const sortTerms of [false, true]) {
		it(`matches the general formatter with SORT_TERMS=${sortTerms}`, () => {
			const previous = Settings.SORT_TERMS;
			Settings.SORT_TERMS = sortTerms;

			try {
				for (const source of cases) {
					const expression = Expression.create(source);
					const expected = toText(
						expression,
						undefined,
						undefined,
						Expression.POW_OPR,
						Expression.sortFunction
					);
					const actual = toDefaultText(
						expression,
						Expression.POW_OPR,
						Expression.sortFunction
					);

					expect({ source, actual }).toEqual({ source, actual: expected });
				}
			} finally {
				Settings.SORT_TERMS = previous;
			}
		});
	}

	it('leaves explicit formatting options on the general formatter', () => {
		const expression = Expression.create('1200*x+x^2');

		expect(expression.text({ scientific: 4 })).toBe('1.200e3*x+x^2');
		expect(expression.text({ decimal: true })).toBe('1200.0*x+x^2.0');
		expect(expression.text({ sort: true })).toBe('x^2+1200*x');
	});
});
