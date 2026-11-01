import '../helpers/registerNerdamerFunctions';

import * as factorModule from '../../src/algebra/factor/factor';
import { Expression } from '../../src/core/classes/expression/Expression';
import { UnsupportedOperationError } from '../../src/core/errors';
import { SymbolicSolver } from '../../src/solve/classes/SymbolicSolver';
import { solve } from '../../src/solve/solve';

describe('Solver exception boundary', () => {
	it('propagates unexpected internal failures', () => {
		const error = new Error('unexpected solver failure');
		const factor = jest.spyOn(factorModule, 'factorExpressionParts').mockImplementation(() => {
			throw error;
		});
		try {
			expect(() => solve('sin(x)+x', 'x')).toThrow(error);
		} finally {
			factor.mockRestore();
		}
	});

	it('preserves unsupported computations as unresolved expressions', () => {
		const factor = jest.spyOn(factorModule, 'factorExpressionParts').mockImplementation(() => {
			throw new UnsupportedOperationError('unsupported solver operation');
		});
		try {
			const result = solve('sin(x)+x', 'x');
			expect(result.count()).toBe(0);
			expect(result.unsolved?.eq(Expression.create('sin(x)+x'))).toBe(true);
			expect(result.partial).toBe(false);
		} finally {
			factor.mockRestore();
		}
	});
});

describe('Public solver failure reporting', () => {
	it('does not silently convert invalid solver inputs into an empty solution set', () => {
		expect(() => solve('x+1', 'x+y')).toThrow();
	});

	it('retains the existing SolutionSet unresolved metadata contract', () => {
		const input = Expression.create('sin(sin(x))');
		const recursion = { depth: 64 };
		const result = new SymbolicSolver(input, 'x', recursion).solve();
		expect(result.unsolved).toBe(input);
	});
});

describe('Symbolic solver recursion limits', () => {
	it('preserves an unresolved expression at an exhausted shared recursion limit', () => {
		const input = Expression.create('sin(sin(x))');
		const recursion = { depth: 64 };
		const result = new SymbolicSolver(input, 'x', recursion).solve();
		expect(result.solutions).toEqual([]);
		expect(result.unsolved).toBe(input);
		expect(recursion.depth).toBe(64);
	});

	it('does not treat an exhausted nested solve as an empty solved equation', () => {
		const input = Expression.create('sin(sin(x))');
		const recursion = { depth: 63 };
		const result = new SymbolicSolver(input, 'x', recursion).solve();
		expect(result.unsolved).toBe(input);
		expect(result.solutions).toEqual([]);
		expect(recursion.depth).toBe(63);
	});

	it('restores the recursion depth after a completed symbolic solve', () => {
		const recursion = { depth: 0 };
		const result = new SymbolicSolver('sin(x)', 'x', recursion).solve();
		expect(result.unsolved).toBeUndefined();
		expect(result.solutions.length).toBeGreaterThan(0);
		expect(recursion.depth).toBe(0);
	});
});

describe('Solve Polynomials', () => {
	it('uses an exact rational resolvent root for a quartic when available', () => {
		const coefficients = ['1/5', '1', '5', '25', '125'].map(coefficient =>
			Expression.create(coefficient)
		);
		const polynomial = Expression.create('1/5+u+5*u^2+25*u^3+125*u^4');
		const roots = SymbolicSolver.quartic(coefficients);

		expect(roots).toHaveLength(4);
		for (const root of roots) {
			expect(() => root.text()).not.toThrow();
			expect(polynomial.subst('u', root).evaluate().isNearlyZero()).toBe(true);
		}
	});

	const expectSolutionTexts = (
		input: string,
		variable: string,
		expected: readonly string[]
	) => {
		expect(
			solve(input, variable)
				.elements.map(root => root.text())
				.sort()
		).toEqual([...expected].sort());
	};

	it('should solve polynomials symbolically', () => {
		// Zero polynomial
		expect(solve('0', 'x').text()).toEqual('{all}');

		// Unit one
		expect(solve('1', 'x').text()).toEqual('{}');

		// Unit negative one
		expect(solve('-1', 'x').text()).toEqual('{}');

		// Positive integer
		expect(solve('42', 'x').text()).toEqual('{}');

		// Negative integer
		expect(solve('-17', 'x').text()).toEqual('{}');

		// Large integer
		expect(solve('123456789', 'x').text()).toEqual('{}');

		// Perfect square integer
		expect(solve('144', 'x').text()).toEqual('{}');

		// Prime integer
		expect(solve('101', 'x').text()).toEqual('{}');

		// Negative square
		expect(solve('-49', 'x').text()).toEqual('{}');

		// Monomial x
		expect(solve('x', 'x').text()).toEqual('{0}');

		// Monomial -x
		expect(solve('-x', 'x').text()).toEqual('{0}');

		// Monomial 5x
		expect(solve('5*x', 'x').text()).toEqual('{0}');

		// Monomial high power
		expect(solve('x^7', 'x').text()).toEqual('{0}');

		// Monomial coefficient power
		expect(solve('12*x^4', 'x').text()).toEqual('{0}');

		// Monomial negative power coefficient
		expect(solve('-9*x^3', 'x').text()).toEqual('{0}');

		// Monomial large power
		expect(solve('x^20', 'x').text()).toEqual('{0}');

		// Monomial repeated variable expansion trap
		expect(solve('x^5', 'x').text()).toEqual('{0}');

		// Bivariate monomial
		expect(solve('x*y', 'x').text()).toEqual('{0}');

		// Bivariate power monomial
		expect(solve('x^3*y^2', 'x').text()).toEqual('{0}');

		// Trivariate monomial
		expect(solve('a*b*c', 'x').text()).toEqual('{}');

		// Expressions independent of the requested variable have no roots.
		expect(solve('a', 'x').text()).toEqual('{}');
		expect(solve('a+b', 'x').text()).toEqual('{}');

		// Mixed parameter monomial
		expect(solve('3*a*x^2', 'x').text()).toEqual('{0}');

		// High degree multivar monomial
		expect(solve('5*x^4*y^3*z^2', 'x').text()).toEqual('{0}');

		// Negative multivar monomial
		expect(solve('-7*x^2*y', 'x').text()).toEqual('{0}');

		// Content multivar monomial
		expect(solve('12*a^2*x^3', 'x').text()).toEqual('{0}');

		// Linear basic
		expect(solve('-9+3*x', 'x').text()).toEqual('{3}');

		// Linear negative leading
		expect(solve('14-7*x', 'x').text()).toEqual('{2}');

		// Linear content extraction
		expect(solve('-27+9*x', 'x').text()).toEqual('{3}');

		// Quadratic perfect square
		expect(solve('9-6*x+x^2', 'x').text()).toEqual('{3}');

		// Quadratic distinct integer roots
		expectSolutionTexts('6-5*x+x^2', 'x', ['3', '2']);

		// Quadratic difference of squares
		expectSolutionTexts('-25+x^2', 'x', ['5', '-5']);

		// Quadratic irreducible simple
		expectSolutionTexts('1+x^2', 'x', ['i', '-i']);

		// Quadratic non-primitive content
		expectSolutionTexts('-24+6*x^2', 'x', ['2', '-2']);

		// Quadratic leading coeff not 1
		expectSolutionTexts('3-7*x+2*x^2', 'x', ['3', '1/2']);

		// Quadratic sign normalization trap
		expect(solve('-4+4*x-x^2', 'x').text()).toEqual('{2}');

		// Cubic with 3 integer roots
		expectSolutionTexts('-6+11*x-6*x^2+x^3', 'x', ['1', '2', '3']);

		// Cubic triple root
		expect(solve('-1+3*x-3*x^2+x^3', 'x').text()).toEqual('{1}');

		// Cubic single integer root
		expectSolutionTexts('2-x-2*x^2+x^3', 'x', ['-1', '1', '2']);

		// Cubic irreducible
		expectSolutionTexts('1+x+x^3', 'x', [
			'cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))+cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2))',
			'(-1/2)*cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))+(-1/2)*cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2))+(1/2)*3^(1/2)*(cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))-cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2)))*i',
			'(-1/2)*cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))+(-1/2)*cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2))+(-1/2)*3^(1/2)*(cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))-cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2)))*i',
		]);

		// Cubic non-monic factorable
		expectSolutionTexts('12-8*x-3*x^2+2*x^3', 'x', ['-2', '2', '3/2']);

		// Quartic perfect square
		expect(solve('1-4*x+6*x^2-4*x^3+x^4', 'x').text()).toEqual('{1}');

		// Quartic difference of squares
		expectSolutionTexts('-16+x^4', 'x', ['2', '-2', '2*i', '-2*i']);

		// Quartic biquadratic symmetric
		expectSolutionTexts('9-10*x^2+x^4', 'x', ['-1', '-3', '3', '1']);

		// Quartic biquadratic irreducible
		expectSolutionTexts('1-10*x^2+x^4', 'x', [
			'(1/2)*2^(1/2)*((4*6^(1/2)+10)^(1/2))',
			'(-1/2)*2^(1/2)*((4*6^(1/2)+10)^(1/2))',
			'(1/2)*2^(1/2)*((-4*6^(1/2)+10)^(1/2))',
			'(-1/2)*2^(1/2)*((-4*6^(1/2)+10)^(1/2))',
		]);

		// Quartic repeated quadratic factor
		expectSolutionTexts('4+4*x^2+x^4', 'x', ['2^(1/2)*i', '-2^(1/2)*i']);

		// Quartic cyclotomic phi_8
		expectSolutionTexts('1+x^4', 'x', [
			'(1/2)*2^(1/2)+(1/2)*2^(1/2)*i',
			'(-1/2)*2^(1/2)+(-1/2)*2^(1/2)*i',
			'(1/2)*2^(1/2)+(-1/2)*2^(1/2)*i',
			'(-1/2)*2^(1/2)+(1/2)*2^(1/2)*i',
		]);

		// Quartic sign trap
		expectSolutionTexts('-9+10*x^2-x^4', 'x', ['-1', '-3', '3', '1']);

		// Quartic even no linear term (Ferrari q=0 trap)
		expectSolutionTexts('8-6*x^2+x^4', 'x', ['2', '-2', '2^(1/2)', '-2^(1/2)']);

		// Power minus one
		expectSolutionTexts('-1+x^6', 'x', [
			'-1',
			'(1/2)*(-1+3^(1/2)*i)',
			'(1/2)*(-1-3^(1/2)*i)',
			'(1/2)*(1+3^(1/2)*i)',
			'(1/2)*(1-3^(1/2)*i)',
			'1',
		]);

		// High power difference of squares
		expectSolutionTexts('-256+x^8', 'x', [
			'2',
			'2*i',
			'-2*i',
			'-2',
			'2^(1/2)*(1+i)',
			'-2^(1/2)*(1+i)',
			'2^(1/2)*(1-i)',
			'-2^(1/2)*(1-i)',
		]);

		// Quintic obvious factor
		expectSolutionTexts('-x+x^5', 'x', ['0', '1', '-1', 'i', '-i']);

		// Repeated high multiplicity
		expect(solve('-1+5*x-10*x^2+10*x^3-5*x^4+x^5', 'x').text()).toEqual('{1}');

		// Chebyshev-like symmetric
		expectSolutionTexts('-1+15*x^2-15*x^4+x^6', 'x', [
			'(1/2)*(2*3^(1/2)-4)',
			'(1/2)*(-2*3^(1/2)-4)',
			'(1/2)*(2*3^(1/2)+4)',
			'(1/2)*(-2*3^(1/2)+4)',
			'-1',
			'1',
		]);

		// Cyclotomic phi_6
		expectSolutionTexts('1-x+x^2', 'x', ['(1/2)*(1+3^(1/2)*i)', '(1/2)*(1-3^(1/2)*i)']);

		// Primitive normalization required
		expectSolutionTexts('24*x^2-36*x^3+12*x^4', 'x', ['0', '2', '1']);

		// Content and sign trap
		expectSolutionTexts('-30*x+45*x^2-15*x^3', 'x', ['0', '2', '1']);

		// Bilinear simple
		expect(solve('-6+x*y', 'x').text()).toEqual('{6*y^-1}');

		// Difference of squares 2 vars
		expectSolutionTexts('x^2-y^2', 'x', ['-y', 'y']);

		// Sum of squares irreducible
		expectSolutionTexts('x^2+y^2', 'x', ['(-y^2)^(1/2)', '-(-y^2)^(1/2)']);

		// Common factor extraction
		expect(solve('a*b*x+a*b*y', 'x').text()).toEqual('{-y}');

		// Grouped factorization
		expectSolutionTexts('-2*x+x^2+x*y-2*y', 'x', ['2', '-y']);

		// Symmetric quadratic form
		expect(solve('x^2+y^2-2*x*y', 'x').text()).toEqual('{y}');

		// Shifted symmetric square
		expectSolutionTexts('x^2+2*x*y+y^2-9', 'x', ['-(-3+y)', '-(3+y)']);

		// Homogeneous cubic factorable
		expectSolutionTexts('x^3-y^3', 'x', ['y', '(1/2)*(-y+3^(1/2)*(-y^2)^(1/2))', '(1/2)*(-y-3^(1/2)*(-y^2)^(1/2))']);

		// Homogeneous quartic
		expectSolutionTexts('x^4-y^4', 'x', ['y', '-y', '(-y^2)^(1/2)', '-(-y^2)^(1/2)']);

		// Mixed bilinear quadratic
		expectSolutionTexts('x^2*y+x*y^2', 'x', ['0', '-y']);

		// Multivariate difference of squares
		expectSolutionTexts('-9+x^2*y^2', 'x', ['3*y^-1', '-3*y^-1']);

		// Cyclotomic in 2 vars
		expectSolutionTexts('x^2+x*y+y^2', 'x', ['(1/2)*(-y+3^(1/2)*(-y^2)^(1/2))', '(1/2)*(-y-3^(1/2)*(-y^2)^(1/2))']);

		// Shifted quadratic form
		expectSolutionTexts('x^2-3*x*y+2*y^2', 'x', ['y', '2*y']);

		// Parametric quadratic
		expectSolutionTexts('a*x^2+b*x+c', 'x', ['(1/2)*a^-1*(-b+(b^2-4*a*c)^(1/2))', '(1/2)*a^-1*(-b-(b^2-4*a*c)^(1/2))']);

		// Parametric symmetric
		expectSolutionTexts('a*x^2-a*y^2', 'x', ['-y', 'y']);

		// Parametric cubic binomial
		expect(solve('a*x^3+3*a*x^2*y+3*a*x*y^2+a*y^3', 'x').text()).toEqual('{-y}');

		// Parametric content extraction
		expectSolutionTexts('3*a*x^2-9*a*x', 'x', ['0', '3']);

		// High degree structured multivar
		expectSolutionTexts('x^4+2*x^2*y^2+y^4', 'x', ['(-y^2)^(1/2)', '-(-y^2)^(1/2)']);

		// Nested symmetric trap
		expectSolutionTexts('x^4-6*x^2*y^2+y^4', 'x', [
			'(1/2)*(2*y+2*2^(1/2)*abs(y))',
			'(1/2)*(2*y-2*2^(1/2)*abs(y))',
			'(1/2)*(-2*y+2*2^(1/2)*abs(y))',
			'(1/2)*(-2*y-2*2^(1/2)*abs(y))',
		]);

		// Non-primitive multivar
		expectSolutionTexts('6*x^2*y-12*x*y^2', 'x', ['0', '2*y']);

		// Sign normalization multivar
		expectSolutionTexts('9-x^2*y^2', 'x', ['3*y^-1', '-3*y^-1']);

		// Triangular structure
		expectSolutionTexts('x^2+y*x+y^2', 'x', ['(1/2)*(-y+3^(1/2)*(-y^2)^(1/2))', '(1/2)*(-y-3^(1/2)*(-y^2)^(1/2))']);

		// Elimination-friendly
		expectSolutionTexts('y^3+x^2*y-x*y^2', 'x', ['(1/2)*(y+3^(1/2)*(-y^2)^(1/2))', '(1/2)*(y-3^(1/2)*(-y^2)^(1/2))']);

		// Mixed parameter trap
		expect(solve('a*x^2+a*y^2-2*a*x*y', 'x').text()).toEqual('{y}');
	});
	it('should solve polynomials numerically', () => {
		// Eisenstein at p=2 (degree 6)
		expect(solve('2+x^6', 'x').text()).toEqual(
			'{0.97208064861983281514+0.56123102415468649072*i, 1.1224620483093729814*i, -0.97208064861983281514+0.56123102415468649072*i, -0.97208064861983281514-0.56123102415468649072*i, -1.1224620483093729814*i, 0.97208064861983281514-0.56123102415468649072*i}'
		);

		// Eisenstein at p=3 (degree 6)
		expect(solve('3+3*x+x^6', 'x').text()).toEqual(
			'{1.1526964207233276826+0.75490009850263872*i, -0.21625877278701202051+1.2648183740813128345*i, -0.93643764793631566207+0.28766766501507426102*i, -0.93643764793631566207-0.28766766501507426102*i, -0.21625877278701202051-1.2648183740813128345*i, 1.1526964207233276826-0.75490009850263872*i}'
		);

		// Eisenstein at p=5 (degree 7)
		expect(solve('5+x^7', 'x').text()).toEqual(
			'{1.1338683748161490796+0.54604223037999900483*i, 0.28004236187986090818+1.2269457544322520172*i, -0.78466126137509662032+0.98393410026475927054*i, -1.258498950641826735, -0.78466126137509662032-0.98393410026475927054*i, 0.28004236187986090818-1.2269457544322520172*i, 1.1338683748161490796-0.54604223037999900483*i}'
		);

		// Eisenstein at p=7 (degree 8)
		expect(solve('7+x^8', 'x').text()).toEqual(
			'{1.1782911097418559293+0.48806415807872162406*i, 0.48806415807872162406+1.1782911097418559293*i, -0.48806415807872162406+1.1782911097418559293*i, -1.1782911097418559293+0.48806415807872162406*i, -1.1782911097418559293-0.48806415807872162406*i, -0.48806415807872162406-1.1782911097418559293*i, 0.48806415807872162406-1.1782911097418559293*i, 1.1782911097418559293-0.48806415807872162406*i}'
		);

		// Eisenstein at p=2 shifted form (degree 6)
		expect(solve('2+4*x^3+x^6', 'x').text()).toEqual(
			'{0.41835963475358351342+0.72462014322916486729*i, 0.75289353060852457665+1.3040498477038782281*i, -0.83671926950716702683, -1.5057870612170491533, 0.41835963475358351342-0.72462014322916486729*i, 0.75289353060852457665-1.3040498477038782281*i}'
		);

		// Cyclotomic Φ7 (degree 6)
		expect(solve('1+x+x^2+x^3+x^4+x^5+x^6', 'x').text()).toEqual(
			'{0.62348980185873353053+0.78183148246802980871*i, -0.22252093395631440429+0.97492791218182360702*i, -0.90096886790241912624+0.43388373911755812048*i, -0.90096886790241912624-0.43388373911755812048*i, -0.22252093395631440429-0.97492791218182360702*i, 0.62348980185873353053-0.78183148246802980871*i}'
		);

		// Cyclotomic Φ9 (degree 6)
		expect(solve('1+x^3+x^6', 'x').text()).toEqual(
			'{0.7660444431189780352+0.64278760968653932632*i, 0.17364817766693034885+0.98480775301220805937*i, -0.93969262078590838405+0.34202014332566873304*i, -0.93969262078590838405-0.34202014332566873304*i, 0.17364817766693034885-0.98480775301220805937*i, 0.7660444431189780352-0.64278760968653932632*i}'
		);

		// Cyclotomic Φ11 (degree 10)
		expect(solve('1+x+x^2+x^3+x^4+x^5+x^6+x^7+x^8+x^9+x^10', 'x').text()).toEqual(
			'{0.84125353283118116886+0.54064081745559758211*i, 0.41541501300188642553+0.90963199535451837141*i, -0.14231483827328514044+0.98982144188093273238*i, -0.65486073394528506406+0.75574957435425828377*i, -0.95949297361449738989+0.28173255684142969771*i, -0.95949297361449738989-0.28173255684142969771*i, -0.65486073394528506406-0.75574957435425828377*i, -0.14231483827328514044-0.98982144188093273238*i, 0.41541501300188642553-0.90963199535451837141*i, 0.84125353283118116886-0.54064081745559758211*i}'
		);

		// Shifted Eisenstein at p=3 (degree 6)
		expect(solve('3+3*x^2+x^6', 'x').text()).toEqual(
			'{1.0780183262990073646+0.86790418531834570265*i, 0.90428517287790553826*i, -1.0780183262990073646+0.86790418531834570265*i, -1.0780183262990073646-0.86790418531834570265*i, -0.90428517287790553826*i, 1.0780183262990073646-0.86790418531834570265*i}'
		);

		// Sparse irreducible trinomial (degree 7)
		expect(solve('1+x+x^7', 'x').text()).toEqual(
			'{0.97980838448990138467+0.51667688383991207112*i, 0.12376188051147740592+1.0566500111970737496*i, -0.70529808793715023876+0.63762376980623151256*i, -0.79654435412845710366, -0.70529808793715023876-0.63762376980623151256*i, 0.12376188051147740592-1.0566500111970737496*i, 0.97980838448990138467-0.51667688383991207112*i}'
		);
	});
});

