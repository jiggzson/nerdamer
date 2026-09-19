import { Parser } from '../../src/core/classes/parser/Parser';
import nerdamer from '../../src/index';

describe('Infinity arithmetic', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/134
	it('normalizes same-sign infinity addition', () => {
		expect(Parser.parse('Infinity+Infinity').text()).toEqual('Inf');
		expect(Parser.parse('-Infinity-Infinity').text()).toEqual('-Inf');
	});

	it('should multiply infinity correctly', () => {
		expect(Parser.parse('8*Inf').text()).toEqual('Inf');
		expect(Parser.parse('Inf*Inf').text()).toEqual('Inf');
		expect(Parser.parse('-8*Inf').text()).toEqual('-Inf');
		expect(Parser.parse('8*-Inf').text()).toEqual('-Inf');
		expect(Parser.parse('-Inf*-Inf').text()).toEqual('Inf');
		expect(Parser.parse('-Inf*Inf').text()).toEqual('-Inf');
		expect(Parser.parse('-a-Inf').text()).toEqual('-Inf');
	});


	it('should handle a value raised to infinity correctly', () => {
		expect(Parser.parse('10^Inf').text()).toEqual('Inf');
		expect(Parser.parse('-10^Inf').text()).toEqual('-Inf');
		expect(Parser.parse('10^-Inf').text()).toEqual('0');
		expect(Parser.parse('0^Inf').text()).toEqual('0');
		expect(Parser.parse('-a*-Inf').text()).toEqual('a*Inf');
		expect(Parser.parse('-a*Inf').text()).toEqual('-a*Inf');
		expect(Parser.parse('-2^Infinity').text()).toEqual('-Inf');
		expect(Parser.parse('-2^-Infinity').text()).toEqual('0');
	});


	it('should throw for undefined', () => {
		expect(() => Parser.parse('0/0')).toThrow();
		expect(() => Parser.parse('-Infinity+Infinity')).toThrow();
		expect(() => Parser.parse('Infinity-Infinity')).toThrow();
		expect(() => Parser.parse('Infinity/Infinity')).toThrow();
		expect(() => Parser.parse('Infinity^Infinity')).toThrow();
		expect(() => Parser.parse('1^Infinity')).toThrow();
		expect(() => Parser.parse('0^0')).toThrow();
		expect(() => Parser.parse('Inf^0')).toThrow();
		expect(() => Parser.parse('(-Inf)^0')).toThrow();
		expect(() => Parser.parse('Inf*0')).toThrow();
		expect(() => Parser.parse('0/Inf')).toThrow();
		expect(() => Parser.parse('Inf/0')).toThrow();
		expect(() => Parser.parse('(-1)^Inf')).toThrow();
		expect(() => Parser.parse('(-1)^Inf')).toThrow();
	});

});

describe('Infinity regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/382
	it('reduces division by positive infinity to zero', () => {
		expect(nerdamer('1/Infinity').text()).toEqual('0');
	});
});
