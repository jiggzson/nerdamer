import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

/** The determinant of a matrix written in nerdamer syntax. */
function determinant(source: string): Expression {
	return nerdamer(`determinant(${source})`) as Expression;
}

/** Whether two expressions are the same polynomial. */
function samePolynomial(actual: Expression, expected: string): boolean {
	return actual.minus(Expression.create(expected)).expand().isZero();
}

describe('Determinants without symbolic pivots', () => {
	it.each([
		['matrix([a,b],[c,d])', 'a*d-b*c'],
		['matrix([x-1,x],[x,x+1])', '-1'],
		['matrix([a,b,c],[d,e,f],[g,h,k])', 'a*e*k-a*f*h-b*d*k+b*f*g+c*d*h-c*e*g'],
		['matrix([x,1,2],[3,x,4],[5,6,x])', 'x^3-37*x+56'],
		['matrix([x-1,1,0],[1,x-1,1],[0,1,x-1])', 'x^3-3*x^2+x+1'],
		['matrix([sin(x),cos(x)],[-cos(x),sin(x)])', 'sin(x)^2+cos(x)^2'],
	])('gives the determinant of %s as a polynomial in its entries', (source, expected) => {
		const result = determinant(source);
		expect(samePolynomial(result, expected)).toBe(true);
		expect(result.text()).not.toContain('^-');
	});

	it.each([
		['matrix([a,b],[c,d])', { a: 0, b: 1, c: 1, d: 0 }, -1],
		['matrix([x-1,x],[x,x+1])', { x: 1 }, -1],
		[
			'matrix([a,b,c],[d,e,f],[g,h,k])',
			{ a: 0, b: 1, c: 0, d: 1, e: 0, f: 0, g: 0, h: 0, k: 1 },
			-1,
		],
	])(
		'stays defined after substituting where a pivot of %s vanishes',
		(source, values, expected) => {
			let result = determinant(source);
			for (const [name, value] of Object.entries(values)) {
				result = result.subst(name, value);
			}
			expect(result.evaluate().eq(Expression.create(expected))).toBe(true);
		}
	);

	it('expands a 5x5 symbolic determinant to its 120 terms', () => {
		const rows = Array.from(
			{ length: 5 },
			(_, i) => `[${Array.from({ length: 5 }, (_, j) => `a${i}${j}`).join(',')}]`
		);
		const result = determinant(`matrix(${rows.join(',')})`);
		expect(result.isSum()).toBe(true);
		expect(result.elementsArray()).toHaveLength(120);
	});

	it.each([
		['matrix([1,2],[3,4])', '-2'],
		['matrix([0,1],[1,0])', '-1'],
		['matrix([1/2,1/3],[1/4,1/5])', '1/60'],
		['matrix([1+i,2],[3,4-i])', '-1+3*i'],
		['matrix([1,2,3],[4,5,6],[7,8,9])', '0'],
		['matrix([0,0],[0,0])', '0'],
		['matrix([sqrt(2),1],[1,sqrt(2)])', '1'],
	])('keeps the exact value of the constant matrix %s', (source, expected) => {
		expect(determinant(source).minus(Expression.create(expected)).expand().isZero()).toBe(true);
	});
});
