import { Parser } from '../../src/api/parser';
import * as legacy from '../../src/core/classes/parser/constants';
import { ASSERTIVE_FUNCTIONS as commonAssertiveFunctions } from '../../src/core/common/common';
import { RESTRICTED } from '../../src/core/Settings';
import { ASSERTIVE_FUNCTIONS, PLUS, SYMBOLIC_ACCESSOR } from '../../src/core/constants/parserSyntax';
import { dataTypes, EXPRESSION_TYPES, RANK } from '../../src/core/constants/entityTypes';
import { COS, TRIG } from '../../src/core/constants/functionNames';
import { PARSER_CONSTANTS } from '../../src/core/constants/parserValues';
import { ALIASES, DEFAULT_IMAGINARY, E, INFINITY, PI, PI_NAME } from '../../src/core/constants/symbolNames';

describe('organized internal constants', () => {
	it('retains every shared value through the legacy parser import', () => {
		expect(legacy.PLUS).toBe(PLUS);
		expect(legacy.SYMBOLIC_ACCESSOR).toBe(SYMBOLIC_ACCESSOR);
		expect(legacy.dataTypes).toBe(dataTypes);
		expect(legacy.EXPRESSION_TYPES).toBe(EXPRESSION_TYPES);
		expect(legacy.RANK).toBe(RANK);
		expect(legacy.COS).toBe(COS);
		expect(legacy.TRIG).toBe(TRIG);
		expect(legacy.PARSER_CONSTANTS).toBe(PARSER_CONSTANTS);
		expect(legacy.PI).toBe(PI);
		expect(legacy.INFINITY).toBe(INFINITY);
		expect(legacy.ALIASES).toBe(ALIASES);
		expect(legacy.E).toBe(E);
		expect(legacy.PI_NAME).toBe(PI_NAME);
		expect(legacy.DEFAULT_IMAGINARY).toBe(DEFAULT_IMAGINARY);
		expect(legacy.TRIG).toContain('sin');
	});

	it('keeps fixed parser names immutable while retaining mutable registries', () => {
		expect(Object.isFrozen(PI)).toBe(true);
		expect(Object.isFrozen(INFINITY)).toBe(true);
		expect(Object.isFrozen(ALIASES)).toBe(true);
		expect(Object.isFrozen(ASSERTIVE_FUNCTIONS)).toBe(true);
		expect(commonAssertiveFunctions).toBe(ASSERTIVE_FUNCTIONS);
		expect(ASSERTIVE_FUNCTIONS.includes('assume')).toBe(true);
		expect(Object.isFrozen(PARSER_CONSTANTS)).toBe(false);
		expect(Object.isFrozen(dataTypes)).toBe(false);
		expect(Object.isFrozen(RESTRICTED)).toBe(false);
	});

	it('retains dynamically configurable imaginary-unit restrictions', () => {
		const previous = Parser.getI();
		const replacement = previous === 'j' ? 'k' : 'j';
		try {
			Parser.setI(replacement);
			expect(Parser.getI()).toBe(replacement);
			expect(RESTRICTED.includes(replacement)).toBe(true);
			expect(RESTRICTED.includes(previous)).toBe(false);
		} finally {
			Parser.setI(previous);
		}
	});

	it('retains precision-dependent numerical constants', () => {
		const pi = PARSER_CONSTANTS[PI_NAME]();
		const e = PARSER_CONSTANTS[E]();
		expect(Number(pi)).toBeCloseTo(Math.PI, 12);
		expect(Number(e)).toBeCloseTo(Math.E, 12);
	});
});
