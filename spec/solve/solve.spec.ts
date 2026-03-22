import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';
import { solve } from '../../src/solve/solve';

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
		).toEqual('-1.5000000000000002,0.2');
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
			'-1.5000000000000002,0.2'
		);
		expect(new FunctionSolver('log(x)').roots().toString()).toEqual('0.9999999999999999');
		expect(new FunctionSolver('tan(x^2)+x', 'x', { maxRoots: 7 }).roots().toString()).toEqual(
			'-3.2709132513114817947,-2.739335850647753876,-2.0642857202996469251,-0.83360619440667797944,0,1.4722278817778812509,2.2645584185768777437'
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
