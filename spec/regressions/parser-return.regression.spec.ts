import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { mathFunctionRegistry } from '../../src/core/dispatch';

describe('Parser return control-flow regressions', () => {
	it('returns from the outermost parser block without leaking ReturnSignal', () => {
		const hadPreviousValue = Object.prototype.hasOwnProperty.call(Parser.KNOWN_VALUES, 'x');
		const previousValue = Parser.KNOWN_VALUES.x;

		try {
			const result = nerdamer('block(x:5, return(x))');
			expect(result.text()).toEqual('5');
		} finally {
			if (hadPreviousValue) {
				Parser.KNOWN_VALUES.x = previousValue;
			} else {
				delete Parser.KNOWN_VALUES.x;
			}
		}
	});

	it('unwinds nested parser blocks without executing later commands', () => {
		const variable = 'script_top_level_return_regression';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const result = nerdamer(
				`block(${variable}:1,block(return(${variable}+1),${variable}:99),${variable}:100)`
			);

			expect(result.text()).toEqual('2');
			expect(Parser.parse(variable).text()).toEqual('1');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('keeps return local to a parser-defined symbolic function', () => {
		const name = 'script_return_boundary_regression';
		const sideEffect = 'script_return_boundary_side_effect';
		delete mathFunctionRegistry[name];
		delete Parser.KNOWN_VALUES[sideEffect];

		try {
			Parser.parse(`${name}(x):=block(return(x+1),99)`);
			const result = nerdamer(
				`block(${sideEffect}:0,${name}(4),${sideEffect}:9,${sideEffect})`
			);

			expect(result.text()).toEqual('9');
		} finally {
			delete mathFunctionRegistry[name];
			delete Parser.KNOWN_VALUES[sideEffect];
		}
	});

	it('preserves structured values returned from a top-level parser block', () => {
		const result = nerdamer('block(return([1,2]),0)');

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.text()).toEqual('[1, 2]');
		}
	});
});

describe('Parser structured-argument regressions', () => {
	it('passes a parser vector of generators to groebner', () => {
		const result = nerdamer('groebner([x+y+z,x*y+x*z+y*z,x*y*z-1])');

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.text()).toEqual('[x+y+z, y^2+y*z+z^2, -1+z^3]');
		}
	});
});
