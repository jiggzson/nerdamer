import { Expression } from '../../src/core/classes/expression/Expression';
import { polarPower } from '../../src/core/functions/complex';
import nerdamer from '../../src/index';

// Shared polar-form power.
describe('polarPower', () => {
	it('returns r^p and p*theta for exact inputs', () => {
		const [modulus, argument] = polarPower(Expression.create('1+i'), Expression.create('2'));
		expect(modulus.text()).toEqual('2');
		expect(argument.text()).toEqual('(1/2)*pi');
	});

	it('rebuilds z^p as r^p * (cos(p*theta) + i*sin(p*theta))', () => {
		for (const [z, p] of [
			['1+i', '1/3'],
			['3-4i', '2.5'],
			['-1+i', '-2/3'],
			['2+3i', '0.5'],
		]) {
			const [modulus, argument] = polarPower(Expression.create(z), Expression.create(p));
			const rebuilt = nerdamer(`r*(cos(t)+i*sin(t))`, { r: modulus, t: argument }).evaluate();
			const direct = nerdamer(`(${z})^(${p})`).evaluate();
			const residual = nerdamer(`abs(a-b)/abs(b)`, { a: rebuilt, b: direct }).evaluate();
			expect(Number(residual.text({ decimal: true }))).toBeLessThan(1e-18);
		}
	});
});
