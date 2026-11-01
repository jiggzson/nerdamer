import { diff } from '../../../src/calculus/derivative/diff';
import { tableOfIntegrals } from '../../../src/calculus/integrate/integrationTable';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Pattern } from '../../../src/core/converters/Pattern';
import '../../../src/index';

type Verification = 'declined' | 'definition' | 'exact' | 'inconclusive' | 'domain-guarded' | 'numeric';

interface VerificationCase {
	id: string;
	source: string;
	verification: Verification;
	samples?: number[];
	expected?: string;
}

interface TableCase extends VerificationCase {
	pattern: string;
}

interface BranchCase extends VerificationCase {
	returnsCandidate: boolean;
}

const tableCases: TableCase[] = [
	{ id: 'trig-01', source: 'cos(2*x)^4', pattern: 'a1*cos(a2*x1^n1)^n2', verification: 'numeric' },
	{ id: 'trig-02', source: 'sin(2*x)^3', pattern: 'a1*sin(a2*x1^n1)^n2', verification: 'numeric' },
	{ id: 'trig-03', source: 'tan(2*x)^4', pattern: 'a1*tan(a2*x1^n1)^n2', verification: 'numeric' },
	{ id: 'trig-04', source: 'sec(2*x)^3', pattern: 'a1*sec(a2*x1^n1)^n2', verification: 'numeric' },
	{ id: 'trig-05', source: 'csc(2*x)^3', pattern: 'a1*csc(a2*x1^n1)^n2', verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-06', source: 'cot(2*x)^4', pattern: 'a1*cot(a2*x1^n1)^n2', verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-07', source: 'cos(2*x)*cos(3*x)', pattern: 'a1*cos(a2*x1^n1)^n2*cos(a3*x1^n3)^n4', verification: 'numeric' },
	{ id: 'trig-08', source: 'sin(2*x)*sin(3*x)', pattern: 'a1*sin(a2*x1^n1)^n2*sin(a3*x1^n3)^n4', verification: 'numeric' },
	{ id: 'trig-09', source: 'cos(2*x)*sin(2*x)', pattern: 'a1*cos(a2*x1^n1)^n2*sin(a3*x1^n3)^n4', verification: 'numeric' },
	{ id: 'trig-10', source: 'sec(2*x)*tan(2*x)', pattern: 'a1*sec(a2*x1^n1)^n2*tan(a3*x1^n3)^n4', verification: 'exact' },
	{ id: 'trig-11', source: 'cot(2*x)*csc(2*x)', pattern: 'a1*cot(a2*x1^n1)^n2*csc(a3*x1^n3)^n4', verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-12', source: '1/cos(2*x)', pattern: 'a1/(cos(a2*x1^n1)^n2)', verification: 'exact' },
	{ id: 'trig-13', source: '1/sin(2*x)', pattern: 'a1/(sin(a2*x1^n1)^n2)', verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-14', source: '1/tan(2*x)', pattern: 'a1/(tan(a2*x1^n1)^n2)', verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-15', source: '1/sec(2*x)', pattern: 'a1/(sec(a2*x1^n1)^n2)', verification: 'exact' },
	{ id: 'trig-16', source: '1/csc(2*x)', pattern: 'a1/(csc(a2*x1^n1)^n2)', verification: 'exact' },
	{ id: 'trig-17', source: '1/cot(2*x)', pattern: 'a1/(cot(a2*x1^n1)^n2)', verification: 'numeric' },
	{ id: 'trig-18', source: 'sin(2*(1+2*x))', pattern: 'a1*sin(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'trig-19', source: 'cos(2*(1+2*x))', pattern: 'a1*cos(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'trig-20', source: 'tan(2*(1+2*x))', pattern: 'a1*tan(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'trig-21', source: 'sec(2*(1+2*x))', pattern: 'a1*sec(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'trig-22', source: 'csc(2*(1+2*x))', pattern: 'a1*csc(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'trig-23', source: 'cot(2*(1+2*x))', pattern: 'a1*cot(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'inv-trig-01', source: 'acos(2*x)', pattern: 'a1*acos(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'inv-trig-02', source: 'asin(2*x)', pattern: 'a1*asin(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'inv-trig-03', source: 'atan(2*x)', pattern: 'a1*atan(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'inv-trig-04', source: 'asec(2*x)', pattern: 'a1*asec(a2*x1^n1)^n2', verification: 'numeric', samples: [0.7, 1, 1.4] },
	{ id: 'inv-trig-05', source: 'acsc(2*x)', pattern: 'a1*acsc(a2*x1^n1)^n2', verification: 'numeric', samples: [0.7, 1, 1.4] },
	{ id: 'inv-trig-06', source: 'acot(2*x)', pattern: 'a1*acot(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'power-log-01', source: 'log(2*x)', pattern: 'a1*log(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'power-log-02', source: 'log(2*x)/x', pattern: '(a1*log(a2*x1^n2)^n3)/x1^n1', verification: 'exact' },
	{ id: 'power-log-03', source: 'x*log(2*x)', pattern: 'a1*x1^n1*log(a2*x1^n2)^n3', verification: 'exact' },
	{ id: 'power-log-04', source: 'x', pattern: 'a1*x1^n1', verification: 'exact' },
	{ id: 'power-log-05', source: '1/x', pattern: 'a1/x1^n1', verification: 'exact' },
	{ id: 'power-log-06', source: '2+2*x', pattern: 'a1*(a2*x1^n1+a3)^n2', verification: 'exact' },
	{ id: 'power-log-07', source: '1/(2+2*x)', pattern: 'a1/((a2*x1^n1+a3)^n2)', verification: 'exact' },
	{ id: 'power-log-08', source: 'log(2*(1+2*x))', pattern: 'a1*log(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'exponential-01', source: '2^(2*x)', pattern: 'a1*(a2)^(a3*x1^n1)', verification: 'exact' },
	{ id: 'exponential-02', source: '2^(-2*x)', pattern: 'a1/(a2)^(a3*x1^n1)', verification: 'numeric' },
	{ id: 'exponential-03', source: '2^(2*(2+x))', pattern: 'a1*(a2)^(a3*(a4*x1^n1+a5)^n2)', verification: 'exact' },
	{ id: 'hyperbolic-trig-01', source: 'cosh(2*x)', pattern: 'a1*cosh(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'hyperbolic-trig-02', source: 'sinh(2*x)', pattern: 'a1*sinh(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'hyperbolic-trig-03', source: 'tanh(2*x)', pattern: 'a1*tanh(a2*x1^n1)^n2', verification: 'numeric' },
	{ id: 'hyperbolic-trig-04', source: 'sech(2*x)', pattern: 'a1*sech(a2*x1^n1)^n2', verification: 'numeric' },
	{ id: 'hyperbolic-trig-05', source: 'csch(2*x)', pattern: 'a1*csch(a2*x1^n1)^n2', verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'hyperbolic-trig-06', source: 'coth(2*x)', pattern: 'a1*coth(a2*x1^n1)^n2', verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'hyperbolic-trig-07', source: 'sinh(2*(1+2*x))', pattern: 'a1*sinh(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'hyperbolic-trig-08', source: 'cosh(2*(1+2*x))', pattern: 'a1*cosh(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'exact' },
	{ id: 'hyperbolic-trig-09', source: 'tanh(2*(1+2*x))', pattern: 'a1*tanh(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'numeric' },
	{ id: 'hyperbolic-trig-10', source: 'coth(2*(1+2*x))', pattern: 'a1*coth(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'numeric' },
	{ id: 'hyperbolic-trig-11', source: 'sech(2*(1+2*x))', pattern: 'a1*sech(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'numeric' },
	{ id: 'hyperbolic-trig-12', source: 'csch(2*(1+2*x))', pattern: 'a1*csch(a2*(a3*x1^n1+a4)^n2)^n3', verification: 'numeric' },
	{ id: 'hyperbolic-trig-13', source: 'sech(2*(1+2*x))*tanh(2*(1+2*x))', pattern: 'a1*sech(a2*(a3*x1^n1+a4)^n2)^n3*tanh(a5*(a6*x1^n4+a7)^n5)^n6', verification: 'exact' },
	{ id: 'hyperbolic-trig-14', source: 'coth(2*(1+2*x))*csch(2*(1+2*x))', pattern: 'a1*coth(a2*(a3*x1^n1+a4)^n2)^n3*csch(a5*(a6*x1^n4+a7)^n5)^n6', verification: 'exact', samples: [0.2, 0.4, 0.7] },
	{ id: 'hyperbolic-trig-15', source: 'cosh(2*x)*sinh(2*x)', pattern: 'a1*cosh(a2*x1^n1)^n2*sinh(a3*x1^n3)^n4', verification: 'exact' },
	{ id: 'hyperbolic-trig-16', source: 'sech(2*x)*tanh(2*x)', pattern: 'a1*sech(a2*x1^n1)^n2*tanh(a3*x1^n3)^n4', verification: 'exact' },
	{ id: 'hyperbolic-trig-17', source: 'coth(2*x)*csch(2*x)', pattern: 'a1*coth(a2*x1^n1)^n2*csch(a3*x1^n3)^n4', verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'inv-hyperbolic-trig-01', source: 'acosh(2*x)', pattern: 'a1*acosh(a2*x1^n1)^n2', verification: 'numeric', samples: [0.7, 1, 1.4] },
	{ id: 'inv-hyperbolic-trig-02', source: 'asinh(2*x)', pattern: 'a1*asinh(a2*x1^n1)^n2', verification: 'exact' },
	{ id: 'inv-hyperbolic-trig-03', source: 'atanh(2*x)', pattern: 'a1*atanh(a2*x1^n1)^n2', verification: 'exact', samples: [0.1, 0.2, 0.4] },
	{ id: 'inv-hyperbolic-trig-04', source: 'asech(2*x)', pattern: 'a1*asech(a2*x1^n1)^n2', verification: 'numeric', samples: [0.1, 0.2, 0.4] },
	{ id: 'inv-hyperbolic-trig-05', source: 'acsch(2*x)', pattern: 'a1*acsch(a2*x1^n1)^n2', verification: 'numeric', samples: [0.2, 0.4, 0.7] },
	{ id: 'inv-hyperbolic-trig-06', source: 'acoth(2*x)', pattern: 'a1*acoth(a2*x1^n1)^n2', verification: 'exact', samples: [0.7, 1, 1.4] },
	{ id: 'known-products-01', source: '2^(2*x)*cos(x)', pattern: 'a1*(a2)^(a3*x1^n1)*cos(a4*x1^n2)^n3', verification: 'numeric' },
	{ id: 'known-products-02', source: '2^(2*x)*sin(x)', pattern: 'a1*(a2)^(a3*x1^n1)*sin(a4*x1^n2)^n3', verification: 'numeric' },
	{ id: 'known-products-03', source: '2^(2*x)*cosh(x)', pattern: 'a1*(a2)^(a3*x1^n1)*cosh(a4*x1^n2)^n3', verification: 'numeric' },
	{ id: 'known-products-04', source: '2^(2*x)*sinh(x)', pattern: 'a1*(a2)^(a3*x1^n1)*sinh(a4*x1^n2)^n3', verification: 'numeric' },
	{ id: 'known-products-05', source: '2^(-2*x)*cosh(x)', pattern: '(a1*cosh(a4*x1^n2)^n3)/(a2)^(a3*x1^n1)', verification: 'numeric' },
	{ id: 'known-products-06', source: '2^(-2*x)*sinh(x)', pattern: '(a1*sinh(a4*x1^n2)^n3)/(a2)^(a3*x1^n1)', verification: 'numeric' },
	{ id: 'known-products-07', source: 'x*2^(2*x)', pattern: 'a1*(a2)^(a3*x1^n1)*x1^n2', verification: 'exact' },
	{ id: 'known-products-08', source: 'x*2^(-2*x)', pattern: '(a1*x1^n2)/(a2)^(a3*x1^n1)', verification: 'exact' },
	{ id: 'known-integrals-01', source: 'sqrt(2-2*x^2)', pattern: 'a1*(-a2*x1^n1+a3)^n2', verification: 'numeric', samples: [0.1, 0.2, 0.4] },
	{ id: 'known-integrals-02', source: '1/(2-2*x^2)', pattern: 'a1/((-a2*x1^n1+a3)^n2)', verification: 'exact', samples: [0.1, 0.2, 0.4] },
	{ id: 'known-integrals-03', source: '-1/sqrt(2-2*x^2)', pattern: '-a1/((-a2*x1^n1+a3)^n2)', verification: 'numeric', samples: [0.1, 0.2, 0.4] },
	{ id: 'known-integrals-04', source: '1/(2+2*x^2)', pattern: 'a1/((a2*x1^n1+a3)^n2)', verification: 'exact' },
	{ id: 'known-integrals-05', source: '-1/(2+2*x^2)', pattern: '-a1/((a2*x1^n1+a3)^n2)', verification: 'exact' },
	{ id: 'known-integrals-06', source: '1/(x*sqrt(2-2/x^2))', pattern: 'a1/(x1^n1*(-a2/x1^n2+a3)^n3)', verification: 'domain-guarded', samples: [1.2], expected: '2^(-1/2)*asec(x)' },
	{ id: 'known-integrals-07', source: '-1/(x*sqrt(2-2/x^2))', pattern: '-a1/(x1^n1*(-a2/x1^n2+a3)^n3)', verification: 'domain-guarded', samples: [1.2], expected: '2^(-1/2)*acsc(x)' },
	{ id: 'known-integrals-08', source: '1/(x*sqrt(2+2/x^2))', pattern: 'a1/(x1^n1*(a2/x1^n2+a3)^n3)', verification: 'domain-guarded', samples: [1.2], expected: 'acsch(x^(-1))/2' },
	{ id: 'special-function-01', source: 'sin(2*x)/x', pattern: '(a1*sin(a2*x1^n2)^n3)/x1^n1', verification: 'definition', expected: 'Si(2*x)' },
	{ id: 'special-function-02', source: 'cos(2*x)/x', pattern: '(a1*cos(a2*x1^n2)^n3)/x1^n1', verification: 'definition', expected: 'Ci(2*x)' },
	{ id: 'special-function-03', source: '2^(2*x)/x', pattern: '(a1*(a2)^(a3*x1^n1))/x1^n2', verification: 'definition', expected: 'Ei(2*x*log(2))' },
];

const branchCases: BranchCase[] = [
	{ id: 'trig-01 primitive', source: 'cos(3*x)', returnsCandidate: true, verification: 'exact' },
	{ id: 'trig-01 odd', source: 'cos(2*x)^3', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-01 noninteger decline', source: 'cos(x)^(1/2)', returnsCandidate: false, verification: 'declined' },
	{ id: 'trig-01 nonlinear decline', source: 'cos(x^2)^3', returnsCandidate: false, verification: 'declined' },
	{ id: 'trig-02 primitive', source: 'sin(3*x)', returnsCandidate: true, verification: 'exact' },
	{ id: 'trig-02 even', source: 'sin(2*x)^4', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-03 primitive', source: 'tan(3*x)', returnsCandidate: true, verification: 'exact' },
	{ id: 'trig-03 odd', source: 'tan(2*x)^3', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-04 primitive', source: 'sec(3*x)', returnsCandidate: true, verification: 'exact' },
	{ id: 'trig-04 even recurrence', source: 'sec(2*x)^4', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-05 primitive', source: 'csc(3*x)', returnsCandidate: true, verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-05 even recurrence', source: 'csc(2*x)^4', returnsCandidate: true, verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-06 primitive', source: 'cot(3*x)', returnsCandidate: true, verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-06 odd', source: 'cot(2*x)^3', returnsCandidate: true, verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'trig-07 left even', source: 'cos(x)^2*cos(2*x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-07 left odd', source: 'cos(x)^3*cos(2*x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-07 right even', source: 'cos(x)*cos(2*x)^2', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-07 right odd', source: 'cos(x)*cos(2*x)^3', returnsCandidate: true, verification: 'inconclusive' },
	{ id: 'trig-07 same frequency', source: 'cos(2*x)^2', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-07 nonlinear decline', source: 'cos(x^2)*cos(2*x)', returnsCandidate: false, verification: 'declined' },
	{ id: 'trig-08 left even', source: 'sin(x)^2*sin(2*x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-08 right odd', source: 'sin(x)*sin(2*x)^3', returnsCandidate: true, verification: 'inconclusive' },
	{ id: 'trig-08 same frequency', source: 'sin(2*x)^2', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-09 left odd', source: 'cos(x)^3*sin(2*x)', returnsCandidate: true, verification: 'inconclusive' },
	{ id: 'trig-09 right even', source: 'cos(x)*sin(2*x)^2', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-09 generic', source: 'cos(x)*sin(2*x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'trig-10 mismatched decline', source: 'sec(x)*tan(2*x)', returnsCandidate: false, verification: 'declined' },
	{ id: 'trig-11 powered decline', source: 'cot(x)^2*csc(x)', returnsCandidate: false, verification: 'declined' },
	{ id: 'trig reciprocal powered decline', source: '1/cos(x)^2', returnsCandidate: false, verification: 'declined' },
	{ id: 'trig composite nonlinear decline', source: 'sin(2*(1+x^2))', returnsCandidate: false, verification: 'declined' },
	{ id: 'inverse trig nonlinear decline', source: 'asin(x^2)', returnsCandidate: false, verification: 'declined' },
	{ id: 'inverse trig powered decline', source: 'atan(x)^2', returnsCandidate: false, verification: 'declined' },
	{ id: 'power-log-02 nonunit denominator power', source: 'log(2*x)/x^2', returnsCandidate: true, verification: 'exact' },
	{ id: 'power-log-02 powered log decline', source: 'log(2*x)^2/x', returnsCandidate: false, verification: 'declined' },
	{ id: 'power-log-03 higher monomial', source: 'x^2*log(2*x)', returnsCandidate: true, verification: 'exact' },
	{ id: 'power-log-06 affine cube', source: '(1+2*x)^3', returnsCandidate: true, verification: 'exact' },
	{ id: 'power-log-06 nonlinear decline', source: '(1+2*x^2)^3', returnsCandidate: false, verification: 'declined' },
	{ id: 'power-log-07 reciprocal affine cube', source: '1/(1+2*x)^3', returnsCandidate: true, verification: 'exact' },
	{ id: 'power-log-08 quadratic positive', source: 'log(2*(1+2*x^2))', returnsCandidate: true, verification: 'numeric' },
	{ id: 'power-log-08 negative quadratic syntax decline', source: 'log(2*(2-x^2))', returnsCandidate: false, verification: 'declined' },
	{ id: 'power-log-08 cubic', source: 'log(2*(1+2*x^3))', returnsCandidate: false, verification: 'declined' },
	{ id: 'power-log-08 negative cubic syntax decline', source: 'log(2*(2-x^3))', returnsCandidate: false, verification: 'declined' },
	{ id: 'power-log-08 unsupported quartic decline', source: 'log(2*(1+2*x^4))', returnsCandidate: false, verification: 'declined' },
	{ id: 'exponential nonlinear decline', source: '2^(x^2)', returnsCandidate: false, verification: 'declined' },
	{ id: 'hyperbolic sech square', source: 'sech(2*x)^2', returnsCandidate: true, verification: 'exact' },
	{ id: 'hyperbolic csch square', source: 'csch(2*x)^2', returnsCandidate: true, verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'hyperbolic unsupported power decline', source: 'sech(2*x)^3', returnsCandidate: false, verification: 'declined' },
	{ id: 'hyperbolic composite sech square', source: 'sech(2*(1+2*x))^2', returnsCandidate: true, verification: 'exact' },
	{ id: 'hyperbolic pair mismatch decline', source: 'sech(x)*tanh(2*x)', returnsCandidate: false, verification: 'declined' },
	{ id: 'hyperbolic cosh-sinh unit cosh', source: 'cosh(2*x)*sinh(2*x)^3', returnsCandidate: true, verification: 'exact' },
	{ id: 'hyperbolic cosh-sinh odd sinh', source: 'cosh(2*x)^2*sinh(2*x)^3', returnsCandidate: true, verification: 'numeric' },
	{ id: 'hyperbolic cosh-sinh odd cosh', source: 'cosh(2*x)^3*sinh(2*x)^2', returnsCandidate: true, verification: 'numeric' },
	{ id: 'hyperbolic cosh-sinh mismatch decline', source: 'cosh(2*x)^2*sinh(3*x)^2', returnsCandidate: false, verification: 'declined' },
	{ id: 'hyperbolic sech-tanh square sech', source: 'sech(2*x)^2*tanh(2*x)^2', returnsCandidate: true, verification: 'exact' },
	{ id: 'hyperbolic sech-tanh odd tanh', source: 'sech(2*x)^3*tanh(2*x)^3', returnsCandidate: true, verification: 'numeric' },
	{ id: 'hyperbolic sech-tanh even sech', source: 'sech(2*x)^4*tanh(2*x)^2', returnsCandidate: true, verification: 'numeric' },
	{ id: 'hyperbolic coth-csch square csch', source: 'coth(2*x)^2*csch(2*x)^2', returnsCandidate: true, verification: 'exact', samples: [0.4, 0.7, 1.1] },
	{ id: 'hyperbolic coth-csch odd coth', source: 'coth(2*x)^3*csch(2*x)^3', returnsCandidate: true, verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'hyperbolic coth-csch even csch', source: 'coth(2*x)^2*csch(2*x)^4', returnsCandidate: true, verification: 'numeric', samples: [0.4, 0.7, 1.1] },
	{ id: 'inverse hyperbolic nonlinear decline', source: 'asinh(x^2)', returnsCandidate: false, verification: 'declined' },
	{ id: 'known product positive resonance', source: 'e^x*cosh(x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'known product negative resonance', source: 'e^(-x)*cosh(x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'known product sinh positive resonance', source: 'e^x*sinh(x)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'known product nonlinear decline', source: 'e^(x^2)*cosh(x)', returnsCandidate: false, verification: 'declined' },
	{ id: 'known product degree six', source: 'x^6*2^x', returnsCandidate: true, verification: 'exact' },
	{ id: 'known product degree seven decline', source: 'x^7*2^x', returnsCandidate: false, verification: 'declined' },
	{ id: 'known product noninteger degree decline', source: 'x^(1/2)*2^x', returnsCandidate: false, verification: 'declined' },
	{ id: 'known integral decreasing radical branch', source: '1/sqrt(2-2*x^2)', returnsCandidate: true, verification: 'numeric', samples: [0.1, 0.2, 0.4] },
	{ id: 'known integral increasing radical branch', source: '1/sqrt(2+2*x^2)', returnsCandidate: true, verification: 'numeric' },
	{ id: 'special function powered numerator decline', source: 'sin(2*x)^2/x', returnsCandidate: false, verification: 'declined' },
	{ id: 'special function nonlinear argument decline', source: 'sin(2*x^2)/x', returnsCandidate: false, verification: 'declined' },
];

const verificationCases: VerificationCase[] = [...tableCases, ...branchCases];

describe('Integration table handlers', () => {
	const lookupResults = new Map<VerificationCase, Expression | undefined>();

	beforeAll(() => {
		for (const tableCase of verificationCases) {
			const source = Expression.create(tableCase.source);
			lookupResults.set(tableCase, tableOfIntegrals.lookup(new Pattern(source, ['x']), 0));
		}
	});

	it.each(tableCases)('$id matches its registered pattern and reaches its handler', tableCase => {
		const source = Expression.create(tableCase.source);
		const pattern = new Pattern(source, ['x']);
		expect(pattern.patternString).toBe(tableCase.pattern);
		const result = lookupResults.get(tableCase)?.copy();
		if (tableCase.verification === 'domain-guarded') {
			expect(result).toBeUndefined();
		} else {
			expect(result).toBeDefined();
		}
	});

	it.each(verificationCases.filter(tableCase => !['declined', 'inconclusive', 'domain-guarded'].includes(tableCase.verification)))(
		'$id returns its verified antiderivative',
		tableCase => {
			const source = Expression.create(tableCase.source);
			const result = lookupResults.get(tableCase)?.copy();
			expect(result).toBeDefined();
			if (tableCase.verification === 'definition') {
				expect(result!.text()).toBe(tableCase.expected);
			} else {
				const residual = diff(result!, 'x').minus(source);
				if (tableCase.verification === 'exact') {
					expect(residual.expand().isZero() || residual.simplify().isZero()).toBe(true);
				} else {
					for (const x of tableCase.samples ?? [0.1, 0.2, 0.35]) {
						const value = Number(residual.evaluate({ x }).text({ decimal: true }));
						expect(Number.isFinite(value)).toBe(true);
						expect(value).toBeCloseTo(0, 8);
					}
				}
			}
		}
	);

	it.each(branchCases.filter(branchCase => branchCase.verification === 'inconclusive'))(
		'$id records an inconclusive derivative residual',
		branchCase => {
			const source = Expression.create(branchCase.source);
			const result = lookupResults.get(branchCase)?.copy();
			expect(result).toBeDefined();
			expect(result!.hasFunction('integrate', true)).toBe(true);

			// An unresolved formal integral cannot be verified by direct differentiation.
			const residual = diff(result!, 'x').minus(source);
			expect(residual.isZero()).toBe(false);
			expect(residual.text()).toContain('diff(');

			// Verify the power-reduction identity before recursive integration.
			const recurse = jest.fn((integrand: Expression, variable: Expression) =>
				Expression.toFunction('integrate', [integrand, variable])
			);
			const formal = tableOfIntegrals.lookup(new Pattern(source, ['x']), 0, recurse);
			expect(recurse).toHaveBeenCalledTimes(1);
			expect(formal?.isFunction('integrate')).toBe(true);
			const [rewritten, variable] = recurse.mock.calls[0];
			expect(variable.eq(Expression.Variable('x'))).toBe(true);
			expect(formal!.getArguments()[0].eq(rewritten)).toBe(true);

			for (const x of [-1.1, -0.4, 0.2, 0.7, 1.3]) {
				const expected = Number(source.evaluate({ x }).text({ decimal: true }));
				const actual = Number(rewritten.evaluate({ x }).text({ decimal: true }));
				expect(Number.isFinite(expected)).toBe(true);
				expect(Number.isFinite(actual)).toBe(true);
				expect(actual).toBeCloseTo(expected, 9);
			}
		}
	);


	it.each(branchCases)('$id exercises the guarded branch', branchCase => {
		const result = lookupResults.get(branchCase)?.copy();
		if (branchCase.returnsCandidate) {
			expect(result).toBeDefined();
		} else {
			expect(result).toBeUndefined();
		}
	});
});
