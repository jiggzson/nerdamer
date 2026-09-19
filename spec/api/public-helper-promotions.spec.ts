import nerdamer from '../../src';
import {
	completeSquare,
	isPrime,
	polyFactors,
	uSub,
	uUnSub,
} from '../../src/api/algebra';
import type {
	CompleteSquareResult,
	SubstitutionMap,
	USubstitutionResult,
} from '../../src/api/algebra';
import { Matrix, nullspace } from '../../src/api/structures';

describe('promoted public helper APIs', () => {
	it('exposes u-substitution through root and algebra APIs', () => {
		const direct: USubstitutionResult = uSub('cos(x)^2+cos(x)+1', 'cos(x)');
		const [substituted, map] = direct;
		const typedMap: SubstitutionMap = map;

		expect(substituted.text({ sort: true })).toBe('u0^2+u0+1');
		expect(uUnSub(substituted, typedMap).eq('cos(x)^2+cos(x)+1')).toBe(true);

		const [rootSubstituted, rootMap] = nerdamer.uSub(
			'cos(x)^2+cos(x)+1',
			'cos(x)'
		);
		expect(rootSubstituted.eq(substituted)).toBe(true);
		expect(nerdamer.uUnSub(rootSubstituted, rootMap).eq('cos(x)^2+cos(x)+1')).toBe(true);
	});

	it('exposes complete square through camelCase direct APIs and sqcomp notation', () => {
		const result: CompleteSquareResult = completeSquare('x^2+6*x+1');
		const rootResult = nerdamer.completeSquare('x^2+6*x+1');
		const parserResult = nerdamer('sqcomp(x^2+6*x+1)');

		expect(result.expression.expand().eq('x^2+6*x+1')).toBe(true);
		expect(rootResult.expression.eq(result.expression)).toBe(true);
		expect(parserResult.eq(result.expression)).toBe(true);
	});

	it('exposes factor lists and primality checks directly', () => {
		const directFactors = polyFactors('x^2-1');
		const rootFactors = nerdamer.polyFactors('x^2-1');

		expect(rootFactors.text()).toBe(directFactors.text());
		expect(directFactors.count()).toBeGreaterThan(1);
		expect(isPrime(17).text()).toBe('1');
		expect(isPrime(18).text()).toBe('0');
		expect(nerdamer.isPrime(17).text()).toBe('1');
	});

	it('exposes complex conjugate and complex sign on the root API', () => {
		expect(nerdamer.conjugate('3+2*i').eq('3-2*i')).toBe(true);
		expect(nerdamer.csgn('3+2*i').text()).toBe('1');
		expect(nerdamer.csgn('-3+2*i').text()).toBe('-1');
	});

	it('exposes nullspace through root and structures APIs', () => {
		const matrix = new Matrix([1, 2, 3], [2, 4, 6]);
		const direct = nullspace(matrix);
		const root = nerdamer.nullspace(matrix);

		expect(direct.text()).toBe('[[-2, 1, 0], [-3, 0, 1]]');
		expect(root.text()).toBe(direct.text());
	});
});
