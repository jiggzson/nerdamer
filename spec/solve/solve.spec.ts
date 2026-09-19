import Decimal from 'decimal.js';

import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';
import { solve } from '../../src/solve/solve';
import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import { SymbolicSolver } from '../../src/solve/classes/SymbolicSolver';
import { ZeroToZeroPowerError } from '../../src/core/errors';
import { toCommonDenominator } from '../../src/algebra/simplify/ratsimp';

describe('Roots', () => {
	it('should calculate numeric roots of polynomials', () => {
		expect(new PolynomialSolver('3*x^20+3x^19-6*x^11+14*x^5-2*x-1').roots().toString()).toEqual(
			'0.71180323272376606667,0.86297656851958989314+0.69101055878558665576*i,0.50481153548365240247+0.89598562919130138041*i,0.080968713699173314951+1.1214549517445542477*i,0.093661835614056869494+0.6509667616114832967*i,-0.44418743097335200181+0.98010396118523725535*i,-0.7744329782811023431+0.84403756595086305687*i,-0.44889018238852665819+0.17504855683342571643*i,-1.1913449820257302616+0.38393926634205905678*i,-1.116835417848109669,-1.1913449820257302616-0.38393926634205905678*i,-0.7744329782811023431-0.84403756595086305687*i,0.093661835614056869494-0.6509667616114832967*i,-0.44418743097335200181-0.98010396118523725535*i,0.080968713699173314951-1.1214549517445542477*i,0.50481153548365240247-0.89598562919130138041*i,-0.44889018238852665819-0.17504855683342571643*i,0.86297656851958989314-0.69101055878558665576*i,1.0189530129144105859-0.18773494685369583385*i,1.0189530129144105859+0.18773494685369583385*i'
		);
		expect(new PolynomialSolver('(2*x+3)(5x-1)').roots().toString()).toEqual('0.2,-1.5');
		expect(new PolynomialSolver('x^3+1').roots().toString()).toEqual(
			'0.5+0.86602540378443864676*i,-1,0.5-0.86602540378443864676*i'
		);
		expect(new PolynomialSolver('(x^2-1)(x^2+1)').roots().toString()).toEqual('1,i,-1,-i');
	});

	it('should preserve nonzero leading coefficients below the convergence tolerance', () => {
		const roots = new PolynomialSolver('0.00000000000000000001*x+1').roots(false);

		expect(roots).toHaveLength(1);
		expect(roots[0].re.eq('-1e20')).toBe(true);
		expect(roots[0].im.isZero()).toBe(true);
	});

	it('should preserve nonzero root components below the convergence tolerance', () => {
		const roots = new PolynomialSolver('x-0.00000000000000000001').roots();

		expect(roots).toHaveLength(1);
		expect(roots[0].eq('0.00000000000000000001')).toBe(true);
	});

	it('should preserve nonzero quadratic discriminants below the convergence tolerance', () => {
		const roots = new PolynomialSolver('x^2-0.00000000000000000001').roots(false);

		expect(roots).toHaveLength(2);
		expect(roots[0].re.eq('0.0000000001')).toBe(true);
		expect(roots[0].im.isZero()).toBe(true);
		expect(roots[1].re.eq('-0.0000000001')).toBe(true);
		expect(roots[1].im.isZero()).toBe(true);
	});

	it('should preserve small imaginary components in analytic quadratic roots', () => {
		const roots = new PolynomialSolver([
			new Decimal('1.0000000000000000000000000000000000000001'),
			new Decimal(-2),
			new Decimal(1),
		]).roots();

		expect(roots).toHaveLength(2);
		expect(roots[0].realPart().eq(1)).toBe(true);
		expect(roots[0].imagPart().eq('0.00000000000000000001')).toBe(true);
		expect(roots[1].realPart().eq(1)).toBe(true);
		expect(roots[1].imagPart().eq('-0.00000000000000000001')).toBe(true);
	});

	it("should calculate numeric roots of functions using Brent's method", () => {
		expect(
			new FunctionSolver('sin(x)', 'x', { lowerBound: -10, upperBound: 10, method: 'Brent' })
				.roots()
				.toString()
		).toEqual(
			'-9.4247779607693798746,-6.2831853071795864769,-3.1415926535897932516,0,3.1415926535897932384,6.2831853071795864412,9.4247779607693797154'
		);
		expect(
			new FunctionSolver('(2*x+3)(5x-1)', 'x', { method: 'Brent' }).roots().toString()
		).toEqual('-1.5,0.2');
		expect(new FunctionSolver('2^x-1', 'x', { method: 'Brent' }).roots().toString()).toEqual(
			'0'
		);
	});

	it("should calculate numeric roots of functions using NewtonRaphson's method", () => {
		expect(
			new FunctionSolver('sin(x)', 'x', {
				lowerBound: -10,
				upperBound: 10,
				method: 'NewtonRaphson',
			})
				.roots()
				.toString()
		).toEqual(
			'-9.4247779607693797154,-6.2831853071795864769,-3.1415926535897932385,0,3.1415926535897932385,6.2831853071795864769,9.4247779607693797154'
		);
		expect(
			new FunctionSolver('(2*x+3)(5x-1)', 'x', { method: 'NewtonRaphson' }).roots().toString()
		).toEqual('-1.5,0.2');
		expect(
			new FunctionSolver('2^x-1', 'x', { method: 'NewtonRaphson' }).roots().toString()
		).toEqual('0');
	});

	it('should limit the number of roots', () => {
		expect(new FunctionSolver('sin(x)', 'x', { maxRoots: 3 }).roots().toString()).toEqual(
			'-3.1415926535897932516,0,3.1415926535897932384'
		);
		expect(new FunctionSolver('(2*x+3)(5x-1)').roots().toString()).toEqual(
			'-1.5,0.2'
		);
		expect(new FunctionSolver('log(x)').roots().toString()).toEqual('1');
		expect(new FunctionSolver('tan(x^2)+x', 'x', { maxRoots: 7 }).roots().toString()).toEqual(
			'-3.2709132513114817947,-2.739335850647753876,-2.0642857202996469251,-0.83360619440667797945,0,1.4722278817778812509,2.2645584185768777436'
		);
	});

	it('should throw for invalid input', () => {
		expect(() => new FunctionSolver('x^2-y')).toThrow();
		expect(() => new PolynomialSolver('1/x+x')).toThrow();
	});
});

describe('Solve Polynomials', () => {
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
		expect(solve('6-5*x+x^2', 'x').text()).toEqual('{3, 2}');

		// Quadratic difference of squares
		expect(solve('-25+x^2', 'x').text()).toEqual('{5, -5}');

		// Quadratic irreducible simple
		expect(solve('1+x^2', 'x').text()).toEqual('{i, -i}');

		// Quadratic non-primitive content
		expect(solve('-24+6*x^2', 'x').text()).toEqual('{2, -2}');

		// Quadratic leading coeff not 1
		expect(solve('3-7*x+2*x^2', 'x').text()).toEqual('{3, 1/2}');

		// Quadratic sign normalization trap
		expect(solve('-4+4*x-x^2', 'x').text()).toEqual('{2}');

		// Cubic with 3 integer roots
		expect(solve('-6+11*x-6*x^2+x^3', 'x').text()).toEqual('{1, 2, 3}');

		// Cubic triple root
		expect(solve('-1+3*x-3*x^2+x^3', 'x').text()).toEqual('{1}');

		// Cubic single integer root
		expect(solve('2-x-2*x^2+x^3', 'x').text()).toEqual('{-1, 1, 2}');

		// Cubic irreducible
		expect(solve('1+x+x^3', 'x').text()).toEqual(
			'{cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))+cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2)), (-1/2)*cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))+(-1/2)*cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2))+(1/2)*3^(1/2)*(cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))-cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2)))*i, (-1/2)*cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))+(-1/2)*cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2))+(-1/2)*3^(1/2)*(cbrt(-1/2+(1/18)*3^(1/2)*31^(1/2))-cbrt(-1/2+(-1/18)*3^(1/2)*31^(1/2)))*i}'
		);

		// Cubic non-monic factorable
		expect(solve('12-8*x-3*x^2+2*x^3', 'x').text()).toEqual('{-2, 2, 3/2}');

		// Quartic perfect square
		expect(solve('1-4*x+6*x^2-4*x^3+x^4', 'x').text()).toEqual('{1}');

		// Quartic difference of squares
		expect(solve('-16+x^4', 'x').text()).toEqual('{2, -2, 2*i, -2*i}');

		// Quartic biquadratic symmetric
		expect(solve('9-10*x^2+x^4', 'x').text()).toEqual('{-1, -3, 3, 1}');

		// Quartic biquadratic irreducible
		expect(solve('1-10*x^2+x^4', 'x').text()).toEqual(
			'{(1/2)*2^(1/2)*((4*6^(1/2)+10)^(1/2)), (-1/2)*2^(1/2)*((4*6^(1/2)+10)^(1/2)), (1/2)*2^(1/2)*((-4*6^(1/2)+10)^(1/2)), (-1/2)*2^(1/2)*((-4*6^(1/2)+10)^(1/2))}'
		);

		// Quartic repeated quadratic factor
		expect(solve('4+4*x^2+x^4', 'x').text()).toEqual('{2^(1/2)*i, -2^(1/2)*i}');

		// Quartic cyclotomic phi_8
		expect(solve('1+x^4', 'x').text()).toEqual(
			'{(1/2)*2^(1/2)+(1/2)*2^(1/2)*i, (-1/2)*2^(1/2)+(-1/2)*2^(1/2)*i, (1/2)*2^(1/2)+(-1/2)*2^(1/2)*i, (-1/2)*2^(1/2)+(1/2)*2^(1/2)*i}'
		);

		// Quartic sign trap
		expect(solve('-9+10*x^2-x^4', 'x').text()).toEqual('{-1, -3, 3, 1}');

		// Quartic even no linear term (Ferrari q=0 trap)
		expect(solve('8-6*x^2+x^4', 'x').text()).toEqual('{2, -2, 2^(1/2), -2^(1/2)}');

		// Power minus one
		expect(solve('-1+x^6', 'x').text()).toEqual(
			'{-1, (1/2)*(-1+3^(1/2)*i), (1/2)*(-1-3^(1/2)*i), (1/2)*(1+3^(1/2)*i), (1/2)*(1-3^(1/2)*i), 1}'
		);

		// High power difference of squares
		expect(solve('-256+x^8', 'x').text()).toEqual(
			'{2, 2*i, -2*i, -2, 2^(1/2)*(1+i), -2^(1/2)*(1+i), 2^(1/2)*(1-i), -2^(1/2)*(1-i)}'
		);

		// Quintic obvious factor
		expect(solve('-x+x^5', 'x').text()).toEqual('{0, 1, -1, i, -i}');

		// Repeated high multiplicity
		expect(solve('-1+5*x-10*x^2+10*x^3-5*x^4+x^5', 'x').text()).toEqual('{1}');

		// Chebyshev-like symmetric
		expect(solve('-1+15*x^2-15*x^4+x^6', 'x').text()).toEqual(
			'{(1/2)*(2*3^(1/2)-4), (1/2)*(-2*3^(1/2)-4), (1/2)*(2*3^(1/2)+4), (1/2)*(-2*3^(1/2)+4), -1, 1}'
		);

		// Cyclotomic phi_6
		expect(solve('1-x+x^2', 'x').text()).toEqual('{(1/2)*(1+3^(1/2)*i), (1/2)*(1-3^(1/2)*i)}');

		// Primitive normalization required
		expect(solve('24*x^2-36*x^3+12*x^4', 'x').text()).toEqual('{0, 2, 1}');

		// Content and sign trap
		expect(solve('-30*x+45*x^2-15*x^3', 'x').text()).toEqual('{0, 2, 1}');

		// Bilinear simple
		expect(solve('-6+x*y', 'x').text()).toEqual('{6*y^-1}');

		// Difference of squares 2 vars
		expect(solve('x^2-y^2', 'x').text()).toEqual('{-y, y}');

		// Sum of squares irreducible
		expect(solve('x^2+y^2', 'x').text()).toEqual('{(-y^2)^(1/2), -(-y^2)^(1/2)}');

		// Common factor extraction
		expect(solve('a*b*x+a*b*y', 'x').text()).toEqual('{-y}');

		// Grouped factorization
		expect(solve('-2*x+x^2+x*y-2*y', 'x').text()).toEqual('{2, -y}');

		// Symmetric quadratic form
		expect(solve('x^2+y^2-2*x*y', 'x').text()).toEqual('{y}');

		// Shifted symmetric square
		expect(solve('x^2+2*x*y+y^2-9', 'x').text()).toEqual('{-(-3+y), -(3+y)}');

		// Homogeneous cubic factorable
		expect(solve('x^3-y^3', 'x').text()).toEqual(
			'{y, (1/2)*(-y+3^(1/2)*(-y^2)^(1/2)), (1/2)*(-y-3^(1/2)*(-y^2)^(1/2))}'
		);

		// Homogeneous quartic
		expect(solve('x^4-y^4', 'x').text()).toEqual('{y, -y, (-y^2)^(1/2), -(-y^2)^(1/2)}');

		// Mixed bilinear quadratic
		expect(solve('x^2*y+x*y^2', 'x').text()).toEqual('{0, -y}');

		// Multivariate difference of squares
		expect(solve('-9+x^2*y^2', 'x').text()).toEqual('{3*y^-2*abs(y), -3*y^-2*abs(y)}');

		// Cyclotomic in 2 vars
		expect(solve('x^2+x*y+y^2', 'x').text()).toEqual(
			'{(1/2)*(-y+3^(1/2)*(-y^2)^(1/2)), (1/2)*(-y-3^(1/2)*(-y^2)^(1/2))}'
		);

		// Shifted quadratic form
		expect(solve('x^2-3*x*y+2*y^2', 'x').text()).toEqual('{y, 2*y}');

		// Parametric quadratic
		expect(solve('a*x^2+b*x+c', 'x').text()).toEqual(
			'{(1/2)*a^-1*(-b+(b^2-4*a*c)^(1/2)), (1/2)*a^-1*(-b-(b^2-4*a*c)^(1/2))}'
		);

		// Parametric symmetric
		expect(solve('a*x^2-a*y^2', 'x').text()).toEqual('{-y, y}');

		// Parametric cubic binomial
		expect(solve('a*x^3+3*a*x^2*y+3*a*x*y^2+a*y^3', 'x').text()).toEqual('{-y}');

		// Parametric content extraction
		expect(solve('3*a*x^2-9*a*x', 'x').text()).toEqual('{0, 3}');

		// High degree structured multivar
		expect(solve('x^4+2*x^2*y^2+y^4', 'x').text()).toEqual('{(-y^2)^(1/2), -(-y^2)^(1/2)}');

		// Nested symmetric trap
		expect(solve('x^4-6*x^2*y^2+y^4', 'x').text()).toEqual(
			'{(1/2)*2^(1/2)*((6*y^2+4*2^(1/2)*abs(y)^2)^(1/2)), (-1/2)*2^(1/2)*((6*y^2+4*2^(1/2)*abs(y)^2)^(1/2)), (1/2)*2^(1/2)*((6*y^2-4*2^(1/2)*abs(y)^2)^(1/2)), (-1/2)*2^(1/2)*((6*y^2-4*2^(1/2)*abs(y)^2)^(1/2))}'
		);

		// Non-primitive multivar
		expect(solve('6*x^2*y-12*x*y^2', 'x').text()).toEqual('{0, 2*y}');

		// Sign normalization multivar
		expect(solve('9-x^2*y^2', 'x').text()).toEqual('{3*y^-2*abs(y), -3*y^-2*abs(y)}');

		// Triangular structure
		expect(solve('x^2+y*x+y^2', 'x').text()).toEqual(
			'{(1/2)*(-y+3^(1/2)*(-y^2)^(1/2)), (1/2)*(-y-3^(1/2)*(-y^2)^(1/2))}'
		);

		// Elimination-friendly
		expect(solve('y^3+x^2*y-x*y^2', 'x').text()).toEqual(
			'{(1/2)*(y+3^(1/2)*(-y^2)^(1/2)), (1/2)*(y-3^(1/2)*(-y^2)^(1/2))}'
		);

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

describe('Solve Functions', () => {
	it('should solve sin(x) = 0', () => {
		expect(solve('sin(x)', 'x').text()).toEqual('{_n*pi}');
	});

	it('should solve cos(x) = 0', () => {
		expect(solve('cos(x)', 'x').text()).toEqual('{(1/2)*pi*(1+2*_n)}');
	});

	it('should solve tan(x) = 0', () => {
		expect(solve('tan(x)', 'x').text()).toEqual('{_n*pi}');
	});

	it('should solve sin with linear argument', () => {
		expect(solve('sin(2*x+1)', 'x').text()).toEqual('{(-1/2)*(1-_n*pi)}');
	});

	it('should solve log(x) = 0', () => {
		expect(solve('log(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve sinh(x) = 0', () => {
		expect(solve('sinh(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve tanh(x) = 0', () => {
		expect(solve('tanh(x)', 'x').text()).toEqual('{0}');
	});
	it('should solve asin(x) = 0', () => {
		expect(solve('asin(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve acos(x) = 0', () => {
		expect(solve('acos(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve atan(x) = 0', () => {
		expect(solve('atan(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve cot(x) = 0', () => {
		expect(solve('cot(x)', 'x').text()).toEqual('{(1/2)*pi*(1+2*_n)}');
	});

	it('should solve asec(x) = 0', () => {
		expect(solve('asec(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve asinh(x) = 0', () => {
		expect(solve('asinh(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve acosh(x) = 0', () => {
		expect(solve('acosh(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve atanh(x) = 0', () => {
		expect(solve('atanh(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve abs(x) = 0', () => {
		expect(solve('abs(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve inverse trig with linear argument', () => {
		expect(solve('asin(2*x+1)', 'x').text()).toEqual('{-1/2}');
		expect(solve('acos(x-3)', 'x').text()).toEqual('{4}');
	});

	it('should solve abs with linear argument', () => {
		expect(solve('abs(x-5)', 'x').text()).toEqual('{5}');
	});

	it('should solve sin(x) = c', () => {
		expect(solve('sin(x)-1/2', 'x').text()).toEqual('{(1/6)*pi}');
	});

	it('should solve cos(x) = c', () => {
		expect(solve('cos(x)-1/2', 'x').text()).toEqual('{(1/3)*pi}');
	});

	it('should solve tan(x) = c', () => {
		expect(solve('tan(x)-1', 'x').text()).toEqual('{(1/4)*pi}');
	});

	it('should solve log(x) = c', () => {
		expect(solve('log(x)-3', 'x').text()).toEqual('{e^3}');
	});

	it('should solve abs(x) = c', () => {
		expect(solve('abs(x)-5', 'x').text()).toEqual('{5, -5}');
	});

	it('should solve a*sin(x) = c', () => {
		expect(solve('2*sin(x)-1', 'x').text()).toEqual('{(1/6)*pi}');
	});

	it('should solve sin(x)^2 = c', () => {
		expect(solve('sin(x)^2-1/4', 'x').text()).toEqual('{(1/6)*pi, (-1/6)*pi}');
	});

	it('should solve asin(x) = c', () => {
		expect(solve('asin(x)-pi/6', 'x').text()).toEqual('{1/2}');
	});

	it('should solve sinh(x) = c', () => {
		expect(solve('sinh(x)-1', 'x').text()).toEqual('{asinh(1)}');
	});

	it('should solve sin with composite argument and constant', () => {
		expect(solve('sin(2*x)-1/2', 'x').text()).toEqual('{(1/12)*pi}');
	});

	it('should solve e^x = c', () => {
		expect(solve('e^x-3', 'x').text()).toEqual('{log(3)}');
	});

	it('should solve cos(x) = 1', () => {
		expect(solve('cos(x)-1', 'x').text()).toEqual('{0}');
	});

	it('should solve sin(x) = 1', () => {
		expect(solve('sin(x)-1', 'x').text()).toEqual('{(1/2)*pi}');
	});

	it('should solve e^(2*x) = c', () => {
		expect(solve('e^(2*x)-5', 'x').text()).toEqual('{(1/2)*log(5)}');
	});

	it('should solve a*e^x = c', () => {
		expect(solve('3*e^x-6', 'x').text()).toEqual('{log(2)}');
	});

	it('should solve log with composite argument and constant', () => {
		expect(solve('log(x+1)-2', 'x').text()).toEqual('{-(1-e^2)}');
	});
});

describe('Equation-solving regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/25
	it('solves a circle equation after coordinate substitution', () => {
		const equation = Expression.create('(x-1)^2+(y-1)^2-4', { x: 4 });
		const solutions = nerdamer.solve(equation, 'y');

		expect(solutions.count()).toBe(2);
		for (const solution of solutions.elements) {
			const residual = equation.evaluate({ y: solution }).expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/55
	it('does not let equation parsing corrupt later solver calls', () => {
		const before = nerdamer.solve('x+1=2', 'x');
		nerdamer('x=1');
		const after = nerdamer.solve('x+1=2', 'x');

		expect(before.text()).toEqual('{1}');
		expect(after.text()).toEqual('{1}');
	});

	it('solves nested reciprocal square roots in relativistic kinetic energy', () => {
		const equation = 'E_k = m c^2 ((1 - v^2 / c^2)^-0.5 - 1)';
		const solutions = nerdamer.solve(equation, 'v');

		expect(solutions.count()).toBe(2);

		const values = { E_k: 1, m: 2, c: 3 };
		const expected =
			values.c *
			Math.sqrt(1 - Math.pow(1 + values.E_k / (values.m * values.c ** 2), -2));
		const evaluated = solutions.elements
			.map(solution => Number(solution.evaluate(values).text({ decimal: true })))
			.sort((a, b) => a - b);

		expect(evaluated[0]).toBeCloseTo(-expected, 12);
		expect(evaluated[1]).toBeCloseTo(expected, 12);
	});

	it('inverts exponential equations with bases independent of the solved variable', () => {
		const baseTen = nerdamer.solve('10^x=y', 'x');
		const natural = nerdamer.solve('e^x=y', 'x');
		const symbolic = nerdamer.solve('n^x=y', 'x');
		const compound = nerdamer.solve('(a+b)^x=y', 'x');

		expect(baseTen.count()).toBe(1);
		expect(natural.count()).toBe(1);
		expect(symbolic.count()).toBe(1);
		expect(compound.count()).toBe(1);
		expect(baseTen.elements[0].minus('log(y)/log(10)').simplify().isZero()).toBe(true);
		expect(natural.elements[0].minus('log(y)').simplify().isZero()).toBe(true);
		expect(symbolic.elements[0].minus('log(y)/log(n)').simplify().isZero()).toBe(true);
		expect(compound.elements[0].minus('log(y)/log(a+b)').simplify().isZero()).toBe(true);
	});

	it('rejects zero-to-zero candidates in variable-base exponent solving', () => {
		expect(() => Expression.create('x^x').evaluate({ x: 0 })).toThrow(
			ZeroToZeroPowerError
		);

		const purePower = nerdamer.solve('x^x', 'x');
		expect(purePower.count()).toBe(0);

		const equalsOne = nerdamer.solve('x^x-1', 'x');
		expect(equalsOne.count()).toBe(1);
		expect(equalsOne.has(Expression.create(1))).toBe(true);

		const equalsSelf = nerdamer.solve('x^x-x', 'x');
		expect(equalsSelf.count()).toBe(1);
		expect(equalsSelf.has(Expression.create(0))).toBe(false);
		expect(equalsSelf.has(Expression.create(1))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/220
	it('solves symbolic rational equations for the denominator variable', () => {
		const solutions = solve(Expression.create('a/(b-1)-c'), 'b');

		expect(solutions.count()).toBe(1);
		const solution = solutions.elements[0];
		expect(solution.evaluate({ a: 6, c: 2 }).text()).toEqual('4');
		expect(solution.evaluate({ a: 5, c: 5 }).text()).toEqual('2');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/233
	it('solves rational equations used as given relations', () => {
		const input = Expression.create('x+x^-1-3');
		const solutions = solve(input, 'x');

		expect(solutions.count()).toBe(2);
		for (const solution of solutions.elements) {
			const residual = input.evaluate({ x: solution.evaluate() }).expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/300
	it('solves a linear equation containing an exact radical without looping', () => {
		const solutions = nerdamer.solve('-5*sqrt(14)-14*x-10', 'x');
		expect(solutions.count()).toBe(1);
		expect(solutions.elements[0].eq(nerdamer('-(5*sqrt(14)+10)/14'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/463
	it('solves linear equations with large integer coefficients exactly', () => {
		expect(solve('999999999*K+7', 'K').text()).toEqual('{-7/999999999}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/474
	it('solves an unsimplified rational expression without overflowing the call stack', () => {
		const original =
			'(-K^2/(-K+24)-448/(-K+24)+24*K/(-K+24))^(-1)*' +
			'(-24-3136*(-K+24)^(-1)-7*(-K+24)^(-1)*K^2+168*(-K+24)^(-1)*K+K)';
		const simplified = '8*(K^2-27*K+464)/(K^2-24*K+448)';
		const originalRoots = solve(original, 'K').elements.map(root => root.expand().text()).sort();
		const simplifiedRoots = solve(simplified, 'K').elements.map(root => root.expand().text()).sort();

		expect(originalRoots).toEqual(simplifiedRoots);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/489
	it('solves powers with very large exact denominators', () => {
		const denominator = '1208925819614629174706176';

		expect(solve('a-2^(-80)', 'a').text()).toEqual(`{1/${denominator}}`);
		expect(solve('a-1/2^80', 'a').text()).toEqual(`{1/${denominator}}`);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/491
	it('solves a very large exact rational value without looping', () => {
		const value = '327516697200495501989961250327/3518252998218182862078279';

		expect(solve(`a-${value}`, 'a').text()).toEqual(`{${value}}`);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/495
	it('solves the large-coefficient boundary case exactly', () => {
		const expression = '(93222358/131836323)*(-2*y+549964829/38888386)-10';

		expect(solve(expression, 'y').text()).toEqual('{1/3625267041734188}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/526
	it('does not introduce the excluded denominator zero as a rational-equation root', () => {
		const actual = solve('0=(x^2-2)/(e^x-1)', 'x');
		const positive = Expression.create('sqrt(2)');
		const negative = Expression.create('-sqrt(2)');

		expect(actual.count()).toEqual(2);
		expect(actual.has(positive)).toBe(true);
		expect(actual.has(negative)).toBe(true);
		expect(actual.has(Expression.create(0))).toBe(false);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/527
	it('solves a fixed-base exponential equation symbolically', () => {
		const actual = solve('2^(x+2)=7', 'x');

		expect(actual.count()).toEqual(1);
		expect(actual.elements[0].minus('log(7)/log(2)-2').simplify().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/541
	it('solves the reported equation containing long registered constant names', () => {
		const constants: Record<string, number> = {
			gross_margin_percentage_fcst_ly_var: 0.03,
			sales_dollars_fcst: 105224064.88000001,
			sales_dollars_ly: 95658240.80000001,
			sales_cost_ly: 23361379.300000004,
		};
		const equation =
			'gross_margin_percentage_fcst_ly_var=((sales_dollars_fcst-sales_cost_fcst)/sales_dollars_fcst)-((sales_dollars_ly-sales_cost_ly)/sales_dollars_ly)';

		try {
			for (const [name, value] of Object.entries(constants)) {
				nerdamer.setConstant(name, value);
			}

			const solutions = solve(equation, 'sales_cost_fcst');
			expect(solutions.count()).toEqual(1);

			const residual = Expression.create(
				'gross_margin_percentage_fcst_ly_var-((sales_dollars_fcst-sales_cost_fcst)/sales_dollars_fcst)+((sales_dollars_ly-sales_cost_ly)/sales_dollars_ly)',
				{ sales_cost_fcst: solutions.elements[0] }
			).evaluate();
			expect(Number(residual.text({ decimal: true }))).toBeCloseTo(0, 12);
		} finally {
			for (const name of Object.keys(constants)) {
				nerdamer.setConstant(name, 'delete');
			}
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/555
	it('does not return a denominator singularity as the solution of 1/x=0', () => {
		expect(nerdamer.solve('1/x', 'x').text()).toEqual('{}');
		expect(nerdamer.solve('1/x=0', 'x').text()).toEqual('{}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/556
	it('solves a linear equation containing pi for either variable', () => {
		const xSolutions = nerdamer.solve('4*x+2*y*pi=2', 'x');
		const ySolutions = nerdamer.solve('4*x+2*y*pi=2', 'y');

		expect(xSolutions.count()).toEqual(1);
		expect(ySolutions.count()).toEqual(1);
		expect(xSolutions.elements[0].minus('(2-2*y*pi)/4').simplify().isZero()).toBe(true);
		expect(ySolutions.elements[0].minus('(2-4*x)/(2*pi)').simplify().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/585
	it('preserves digits and underscores in variable names while solving', () => {
		const solutions = nerdamer.solve('foo__16_bar=foo__16-bar__16', 'foo__16');

		expect(solutions.count()).toEqual(1);
		expect(solutions.elements[0].minus('foo__16_bar+bar__16').simplify().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/589
	it('solves through a long decimal constant without hanging', () => {
		const solutions = nerdamer.solve(
			'bop_auc___plan=eop_cost___plan/3416.3333333333344',
			'eop_cost___plan'
		);

		expect(solutions.count()).toEqual(1);
		expect(
			solutions.elements[0]
				.minus('3416.3333333333344*bop_auc___plan')
				.simplify()
				.isZero()
		).toBe(true);
	}, 15_000);

	// Regression: https://github.com/jiggzson/nerdamer/issues/600
	it('solves an equivalent tangent quotient consistently', () => {
		const direct = nerdamer.solve('tan(b)=c', 'b');
		const quotient = nerdamer.solve('sin(b)/cos(b)=c', 'b');

		expect(direct.count()).toEqual(1);
		expect(quotient.count()).toEqual(1);
		expect(quotient.elements[0].eq(direct.elements[0])).toBe(true);

		const b = quotient.elements[0].evaluate({ c: '1/2' });
		const residual = Expression.create('sin(b)/cos(b)-1/2', { b }).evaluate();
		expect(residual.isNearlyZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/633
	it('solves log(y)=-t and verifies the real principal-log branch', () => {
		const solutions = nerdamer.solve('log(y)=-t', 'y');

		expect(solutions.count()).toEqual(1);
		expect(solutions.elements[0].eq('e^(-t)')).toBe(true);
		for (const t of [-2, 0, 2]) {
			const y = solutions.elements[0].evaluate({ t });
			const residual = Expression.create('log(y)+t', { y, t }).evaluate();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/4
	it('finds both real roots when the solve variable also appears in an exponent', () => {
		const solutions = nerdamer.solve('x=2^x/4', 'x');
		const roots = solutions.elements
			.map(solution => Number(solution.evaluate().text({ decimal: true })))
			.sort((a, b) => a - b);

		expect(roots).toHaveLength(2);
		expect(roots[0]).toBeCloseTo(0.309906932380691, 12);
		expect(roots[1]).toBeCloseTo(4, 12);
		const source = Expression.create('x-2^x/4');
		for (const x of roots) {
			const residual = source.evaluate({ x });
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/133
	it('does not accept a false Newton convergence cycle', () => {
		const solver = new FunctionSolver('x^3-x', 'x', {
			method: 'NewtonRaphson',
			maxIterations: 1,
		});
		const initialGuess = new Decimal(1).div(new Decimal(5).sqrt());
		const result = solver.NewtonRaphson(initialGuess);

		expect(result.converged).toBe(false);
		expect(result.error.greaterThan(solver.tolerance)).toBe(true);
		expect(solver.evaluate(result.root).abs().greaterThan(new Decimal('1e-12'))).toBe(true);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/129
	it('rejects candidates that do not satisfy the source equation', () => {
		const rejected = new SolutionSet();
		rejected.addSolution(Expression.create('2'), Expression.create('x^2-1'), 'x');
		rejected.addSolution(Expression.create('0'), Expression.create('x^2-1'), 'x');
		rejected.addSolution(Expression.create('0'), Expression.create('x+sin(i)'), 'x');
		expect(rejected.text()).toEqual('{}');

		const accepted = new SolutionSet();
		accepted.addSolution(Expression.create('1'), Expression.create('x^2-1'), 'x');
		accepted.addSolution(Expression.create('a'), Expression.create('x^2-a^2'), 'x');
		expect(accepted.text()).toEqual('{1, a}');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/128
	it('returns no solution when cancellation leaves a contradiction', () => {
		expect(nerdamer.solve('x+2=x+3', 'x').text()).toEqual('{}');
		expect(nerdamer.solveeqs(['x+2=x+3']).text()).toEqual('[]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/595
	it('keeps numerical roots when the terminal scan endpoint is outside the real domain', () => {
		const solutions = nerdamer.solve(
			'0=((2*0.87*x-2*sqrt(x^2(0.87^2-1)+4*4^2))/2)^2+((2*0.86*x-2*sqrt(x^2(0.86^2-1)+4*5^2))/2)^2-0.87*((2*0.87*x-2*sqrt(x^2(0.87^2-1)+4*4^2))/2)*((2*0.86*x-2*sqrt(x^2(0.86^2-1)+4*5^2))/2)-6^2',
			'x'
		);
		const roots = solutions.elements
			.map(solution => Number(solution.evaluate().text({ decimal: true })))
			.sort((a, b) => a - b);

		expect(roots).toHaveLength(2);
		expect(roots[0]).toBeCloseTo(3.9, 1);
		expect(roots[1]).toBeCloseTo(13.0, 1);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/588
	it('normalizes nested rational denominators before solving', () => {
		const derivative = nerdamer.diff('10-110/(20-100/(10+x))-x', 'x');
		const normalized = toCommonDenominator(derivative);
		const numerator = normalized.getNumerator().expand();
		const denominator = normalized.getDenominator().expand();

		expect(numerator.isPolynomialLike()).toBe(true);
		expect(denominator.isPolynomialLike()).toBe(true);
		expect(
			numerator
				.times('2*(x+5)^2')
				.minus(denominator.times('5-20*x-2*x^2'))
				.expand()
				.isZero()
		).toBe(true);

		const symbolic = new SymbolicSolver(numerator, 'x').solve();
		expect(symbolic.unsolved).toBeUndefined();
		expect(symbolic.solutions).toHaveLength(2);

		const solutions = nerdamer.solve(derivative, 'x');
		expect(solutions.count()).toEqual(2);
		for (const root of symbolic.solutions) {
			expect(solutions.elements.some(solution => solution.eq(root))).toBe(true);
		}

		const roots = solutions.elements
			.map(solution => Number(solution.evaluate().text({ decimal: true })))
			.sort((a, b) => a - b);
		expect(roots[0]).toBeCloseTo(-5 - Math.sqrt(55 / 2), 10);
		expect(roots[1]).toBeCloseTo(-5 + Math.sqrt(55 / 2), 10);

		for (const solution of solutions.elements) {
			expect(derivative.evaluate({ x: solution }).isNearlyZero()).toBe(true);
			expect(solution.eq('-10')).toBe(false);
			expect(solution.eq('-5')).toBe(false);
		}

		// Normalization may cancel a source denominator, but the solver must still
		// reject a root at a point where the original equation is undefined.
		expect(nerdamer.solve('(x-1)/(1-1/x)=1', 'x').text()).toEqual('{}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/679
	it('solves a symbolic equation even when a trailing subtraction is present', () => {
		const solutions = nerdamer.solve(
			'T=v*F*((((1+tr)^n-1)/tr)-1)',
			'T'
		);
		expect(solutions.count()).toEqual(1);
		const expected = Expression.create('v*F*((((1+tr)^n-1)/tr)-1)');
		expect(solutions.elements[0].minus(expected).simplify().text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/670
	it('does not introduce x=0 when solving y(x+1)=0 for x', () => {
		expect(nerdamer.solve('x*y+y=0', 'x').text()).toEqual('{-1}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/671
	it('handles whitespace consistently while isolating a variable', () => {
		expect(nerdamer.solve('A = B + C * D / 100', 'A').text()).toEqual(
			'{(-1/100)*(-100*B-C*D)}'
		);
		expect(nerdamer.solve('A * B = C + D', 'A').text()).toEqual('{-B^-1*(-C-D)}');
		expect(nerdamer.solve('A = B + C - D', 'A').text()).toEqual('{-(-B-C+D)}');
	});

	// Regressions:
	// https://github.com/together-science/nerdamer-prime/issues/131
	// https://github.com/jiggzson/nerdamer/issues/636
	it('clears rational denominators without aborting at a trial singularity', () => {
		const decimalSystem = nerdamer.solveeqs([
			'x=5',
			'0.6=1-(x/(10+y))',
		]);
		expect(decimalSystem.text()).toEqual('[{x => 5, y => 2.5}]');

		const exactSystem = nerdamer.solveeqs(['x=5', '3/5=1-x/(10+y)']);
		expect(exactSystem.text()).toEqual('[{x => 5, y => 5/2}]');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/77
	it('solves radical equations and verifies all branches', () => {
		const solutions = nerdamer.solve('sqrt(x)-2*x+x^2', 'x');
		expect(solutions.count()).toEqual(3);
		const expected = ['(1/2)*(3-5^(1/2))', '0', '1'].map(root =>
			Expression.create(root)
		);
		for (const root of expected) {
			expect(
				solutions.elements.some(solution => solution.minus(root).simplify().isZero())
			).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/677
	it('solves mixed linear and absolute-value equations', () => {
		const solutions = nerdamer.solve(
			'x+0.0025*(abs(0-x)+abs(0-x))=105.8241145033',
			'x'
		);
		expect(solutions.count()).toEqual(1);
		const x = Number(solutions.elements[0].evaluate().text({ decimal: true }));
		expect(Math.abs(x - 105.29762637144279)).toBeLessThan(1e-10);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/655
	it('isolates and verifies radicals when solving for another variable', () => {
		// Unrestricted x makes the principal-root branch parameter-dependent, so use a
		// closed positive value and require the squared equation's extra root to be rejected.
		const solutions = nerdamer.solve('4+y+sqrt(4*y)=19', 'y');
		expect(solutions.text()).toEqual('{9}');
		for (const solution of solutions.elements) {
			const residual = Expression.create('4+y+sqrt(4*y)-19', {
				y: solution,
			}).simplify();
			expect(residual.isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/405
	it('solves x-sqrt(x+1)=5 and verifies the radical branch', () => {
		expect(nerdamer.solve('x-sqrt(x+1)=5', 'x').text()).toEqual('{8}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/405
	it('rejects extraneous logarithmic roots introduced by transformations', () => {
		expect(
			nerdamer.solve('log(x-1)+log(x+3)+log(3)=log(15)', 'x').text()
		).toEqual('{2}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/405
	it('solves simple linear equations over complex values and verifies candidates', () => {
		const first = nerdamer.solve('(z+5)/(3-i)=2-5*i', 'z');
		expect(first.text()).toEqual('{-4-17*i}');
		expect(
			Expression.create('(z+5)/(3-i)-(2-5*i)', { z: first.elements[0] }).isNearlyZero()
		).toBe(true);

		const second = nerdamer.solve('5-7*i+(3-11*i)*z=7-6*i', 'z');
		expect(second.text()).toEqual('{-1/26+(5/26)*i}');
		expect(
			Expression.create('5-7*i+(3-11*i)*z-(7-6*i)', {
				z: second.elements[0],
			}).isNearlyZero()
		).toBe(true);
	});

	// Regressions:
	// https://github.com/together-science/nerdamer-prime/issues/16
	// https://github.com/jiggzson/nerdamer/issues/395
	it('inverts arbitrary-base exponentials', () => {
		const solution = nerdamer.solve('10^x=40', 'x');
		expect(solution.count()).toEqual(1);
		const expected = Expression.create('log(40)/log(10)');
		expect(solution.elements[0].minus(expected).simplify().text()).toEqual('0');
	});
});
