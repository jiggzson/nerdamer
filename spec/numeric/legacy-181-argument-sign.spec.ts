import { Expression } from '../../src/core/classes/expression/Expression';
import '../../src/index';

describe('legacy #181 complex argument and sign behavior', () => {
	// Principal arguments use Arg(z) in (-pi, pi] for nonzero z.
	// Reference: NIST DLMF §4.2, https://dlmf.nist.gov/4.2
	const argumentsToCheck = [
		['arg(2)', '0'],
		['arg(-2)', 'pi'],
		['arg(2*i)', 'pi/2'],
		['arg(-2*i)', '-pi/2'],
		['arg(1+i)', 'pi/4'],
		['arg(-1+i)', '3*pi/4'],
		['arg(-1-i)', '-3*pi/4'],
		['arg(1-i)', '-pi/4'],
	] as const;

	it.each(argumentsToCheck)('evaluates the principal argument %s', (input, expected) => {
		const actual = Expression.create(input).evaluate();
		const reference = Expression.create(expected).evaluate();
		expect(actual.minus(reference).evaluate().isNearlyZero()).toBe(true);
	});

	// The complex sign follows the real component first, then the imaginary
	// component when the real component is exactly zero.
	const signs = [
		['csgn(2+3*i)', '1'],
		['csgn(2-3*i)', '1'],
		['csgn(-2+3*i)', '-1'],
		['csgn(-2-3*i)', '-1'],
		['csgn(3*i)', '1'],
		['csgn(-3*i)', '-1'],
		['csgn(0)', '0'],
	] as const;

	it.each(signs)('evaluates the complex sign %s', (input, expected) => {
		expect(Expression.create(input).evaluate().eq(expected)).toBe(true);
	});

	it.each([
		['csgn(x+i)', 'csgn(x+i)'],
		['csgn(i*x)', 'csgn(i*x)'],
		['arg(x+i)', 'atan2(1, x)'],
		['arg(i*x)', 'atan2(x, 0)'],
	] as const)('retains unresolved symbolic form of %s', (input, expected) => {
		expect(Expression.create(input).text()).toEqual(expected);
	});
});
