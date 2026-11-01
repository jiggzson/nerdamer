import { scientificToDecimal } from '../../src/core/functions/string';

describe('Scientific number strings', () => {
	it('should convert correctly', () => {
		// Edge cases: https://gist.github.com/jiggzson/b5f489af9ad931e3d186
		expect(scientificToDecimal('2.5e25')).toBe('25000000000000000000000000');
		expect(scientificToDecimal('-1.123e-10')).toBe('-0.0000000001123');
		expect(scientificToDecimal('-1e-3')).toBe('-0.001');
		expect(scientificToDecimal('-1.2e-2')).toBe('-0.012');
		expect(scientificToDecimal('1.23423534e-12')).toBe('0.00000000000123423534');
		expect(scientificToDecimal('1.2e+2')).toBe('120');
		expect(scientificToDecimal('+1.2e+2')).toBe('120');
		expect(scientificToDecimal('12345.6e-1')).toBe('1234.56');
		expect(scientificToDecimal('45998787.78e3')).toBe('45998787780');
		expect(scientificToDecimal('45998787.78e2')).toBe('4599878778');
		expect(scientificToDecimal('45998787.78e1')).toBe('459987877.8');
		expect(scientificToDecimal('45998787.78e0')).toBe('45998787.78');
		expect(scientificToDecimal('45998787.78e-3')).toBe('45998.78778');
		expect(scientificToDecimal('45998787.78e-5')).toBe('459.9878778');
		expect(scientificToDecimal('45998787.78e-10')).toBe('0.004599878778');
		expect(scientificToDecimal('3.4028236692093846346e+38')).toBe(
			'340282366920938463460000000000000000000'
		);
		expect(scientificToDecimal('5e-3')).toBe('0.005');
		expect(scientificToDecimal('.5e-3')).toBe('0.0005');
		expect(scientificToDecimal('-.5e-3')).toBe('-0.0005');
		expect(scientificToDecimal('-45998787.78e3')).toBe('-45998787780');
		expect(scientificToDecimal('-45998787.78e2')).toBe('-4599878778');
		expect(scientificToDecimal('-45998787.78e1')).toBe('-459987877.8');
		expect(scientificToDecimal('-45998787.78e0')).toBe('-45998787.78');
		expect(scientificToDecimal('-45998787.78e-3')).toBe('-45998.78778');
		expect(scientificToDecimal('-45998787.78e-5')).toBe('-459.9878778');
		expect(scientificToDecimal('-45998787.78e-10')).toBe('-0.004599878778');
	});
});
