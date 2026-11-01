import nerdamer from '../../src/index';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { connectedNumericalFunctions } from '../../src/core/functions/connectFunctions';

const connectedName = 'compat_connected_numerical_function';

afterEach(() => {
	delete connectedNumericalFunctions[connectedName];
	if (mathFunctionRegistry[connectedName]?.level === 'user') {
		delete mathFunctionRegistry[connectedName];
	}
});

describe('root numerical function connector', () => {
	it('connects numerical functions without replacing their symbolic form', () => {
		const math = {
			[connectedName]: (x: number) => x * x + 1,
		};

		expect(nerdamer.connect([connectedName], math)).toBe(nerdamer);
		expect(nerdamer(`${connectedName}(2)`).text()).toBe(`${connectedName}(2)`);
		expect(nerdamer(`${connectedName}(2)`).evaluate().text()).toBe('5');
		expect(nerdamer(`${connectedName}(x)`).buildFunction(['x'])(3)).toBe(10);
	});
});
