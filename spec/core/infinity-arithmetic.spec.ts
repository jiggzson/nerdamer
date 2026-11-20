import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';
import { UndefinedError } from '../../src/core/errors';
import nerdamer from '../../src/index';

describe('Infinity arithmetic', () => {
	afterEach(() => clearAssumptions());

	it.each([
		// Infinity times a factor of known sign.
		['Infinity/2', 'Inf'],
		['Infinity/log(2)', 'Inf'],
		['Infinity/(-log(2))', '-Inf'],
		['sqrt(2)*Infinity', 'Inf'],
		['pi*Infinity', 'Inf'],
		['Infinity/(1-sqrt(2))', '-Inf'],
		// The -Inf paths match the +Inf ones.
		['1 + (-Infinity)', '-Inf'],
		['1-(-Infinity)', 'Inf'],
		['log(5)/(-Infinity)', '0'],
		['5/(-Infinity)', '0'],
		['1/log(0)', '0'],
		// Powers with an infinite exponent.
		['e^(-Infinity)', '0'],
		['e^Infinity', 'Inf'],
		['(1/2)^Infinity', '0'],
		['(1/2)^(-Infinity)', 'Inf'],
		['log(2)^Infinity', '0'],
		// Powers of infinity.
		['Infinity^2', 'Inf'],
		['(-Infinity)^2', 'Inf'],
		['(-Infinity)^3', '-Inf'],
		['Infinity^(1/2)', 'Inf'],
		['Infinity^(-1)', '0'],
		['(-Infinity)^(-2)', '0'],
		// -Inf to a non-integer power is (-1)^p*Inf on the principal branch.
		['(-Infinity)^(1/2)', 'i*Inf'],
		['sqrt(-Infinity)', 'i*Inf'],
		['(-Infinity)^(3/2)', '-i*Inf'],
		['(-Infinity)^(1/3)', '(-1)^(1/3)*Inf'],
		// A complex direction keeps only the sign of real factors of known sign.
		['2*i*Infinity', 'i*Inf'],
		['-3*pi*i*Infinity', '-i*Inf'],
		['sqrt(2)*i*Infinity', 'i*Inf'],
		['(1-sqrt(2))*i*Infinity', '-i*Inf'],
		['sqrt(-Infinity)/2', 'i*Inf'],
		['2*(1+i)*Infinity', 'Inf*(1+i)'],
		['2*x*i*Infinity', 'x*i*Inf'],
	])('evaluates %s to %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it.each([
		['x*Infinity', 'x*Inf'],
		['Infinity+x', 'x+Inf'],
		['x-Infinity', 'x-Inf'],
		['x-(-Infinity)', 'x+Inf'],
		['x^Infinity', 'x^Inf'],
		['Infinity^x', 'Inf^x'],
		['Infinity*i', 'i*Inf'],
	])('leaves %s alone when the sign or size is unknown', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it('recognizes infinite products', () => {
		expect(Expression.create('Infinity').isInfinite()).toBe(true);
		expect(Expression.create('-Infinity').isInfinite()).toBe(true);
		expect(Expression.create('i*Infinity').isInfinite()).toBe(true);
		expect(Expression.create('x*Infinity').isInfinite()).toBe(true);
		expect(Expression.create('x+Infinity').isInfinite()).toBe(false);
		expect(Expression.create('2*x').isInfinite()).toBe(false);
		// isInf and its legacy alias isInfinity stay true only for real ±Inf.
		expect(Expression.create('i*Infinity').isInf()).toBe(false);
		expect(Expression.create('i*Infinity').isInfinity()).toBe(false);
		expect(Expression.create('-Infinity').isInfinity()).toBe(true);
	});

	it('uses a sign established by an assumption', () => {
		assume('x>0');
		expect(nerdamer('x*Infinity').text()).toBe('Inf');
		expect(nerdamer('x*(-Infinity)').text()).toBe('-Inf');
		expect(nerdamer('x*i*Infinity').text()).toBe('i*Inf');
	});

	it.each([
		['Infinity-Infinity'],
		['0*Infinity'],
		['1^Infinity'],
		['Infinity^0'],
		['(-2)^Infinity'],
	])('keeps %s undefined', source => {
		expect(() => nerdamer(source)).toThrow(UndefinedError);
	});
});

describe('Complex decomposition of infinity', () => {
	it.each([
		['realpart(Infinity)', 'Inf'],
		['realpart(-Infinity)', '-Inf'],
		['imagpart(Infinity)', '0'],
		['realpart(i*Infinity)', '0'],
		['imagpart(-i*Infinity)', '-Inf'],
		['realpart((1+i)*Infinity)', 'Inf'],
		['realpart(Infinity+pi*i)', 'Inf'],
		['imagpart(Infinity+pi*i)', 'pi'],
		['abs(i*Infinity)', 'Inf'],
		['abs(Infinity+pi*i)', 'Inf'],
		['arg(-Infinity)', 'pi'],
		['arg(i*Infinity)', '(1/2)*pi'],
	])('splits %s into %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it.each([
		['1/(i*Infinity)', '0'],
		['(1+i)/Infinity', '0'],
		['(2+i)/(i*Infinity)', '0'],
		['(Infinity+pi*i)/log(10)', 'pi*log(10)^-1*i+Inf'],
		['exp(Infinity+pi*i)', '-Inf'],
		['exp(Infinity+pi*i/2)', 'i*Inf'],
		['exp(-Infinity+pi*i)', '0'],
		['(1/2)^(Infinity+i)', '0'],
	])('evaluates %s to %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it.each([
		// The principal branch, log|x| + i*pi.
		['log(-Infinity)', 'pi*i+Inf'],
		['exp(log(-Infinity))', '-Inf'],
		['abs(log(-Infinity))', 'Inf'],
		['1/log(-Infinity)', '0'],
	])('takes the principal logarithm in %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it.each([
		['exp(i*Infinity)', 'e^(i*Inf)'],
		['e^(x+Infinity)', 'e^(x+Inf)'],
	])('leaves %s symbolic', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});
});

// Results match SymPy 1.14, where nan corresponds to UndefinedError.
describe('Infinite like terms and products', () => {
	it.each([
		['x*Infinity+x*Infinity', 'x*Inf'],
		['i*Infinity+i*Infinity', 'i*Inf'],
		['(i*Infinity)*(i*Infinity)', '-Inf'],
		['(i*Infinity)*(-i*Infinity)', 'Inf'],
		['(x*Infinity)*(x*Infinity)', 'x^2*Inf'],
		['Infinity*(i*Infinity)', 'i*Inf'],
		['((1+i)*Infinity)*((1+i)*Infinity)', 'i*Inf'],
	])('evaluates %s to %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});

	it.each([['x*Infinity-x*Infinity'], ['x*Infinity-2*x*Infinity'], ['i*Infinity-i*Infinity']])(
		'keeps %s undefined',
		source => {
			expect(() => nerdamer(source)).toThrow(UndefinedError);
		}
	);
});
