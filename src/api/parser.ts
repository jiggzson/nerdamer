/**
 * Supported high-level parser APIs and parser configuration types.
 *
 * @module parser
 */
import { Parser as InternalParser } from '../core/classes/parser/Parser';

import type {
	ParserConstants,
	ParserValuesObject,
} from '../core/classes/parser/types';
import type { SettingsType } from '../core/Settings';
import type { ExpressionInput, ParserEntity } from '../core/types';

type BooleanSettingName = {
	[K in keyof SettingsType]: SettingsType[K] extends boolean ? K : never;
}[keyof SettingsType];

/**
 * Supported high-level parser surface.
 *
 * Tokenization, RPN conversion, and parser-stack machinery remain internal
 * implementation details even though Nerdamer itself uses them across modules.
 */
export interface ParserAPI {
	/** Creates another parser facade backed by the shared parser configuration. */
	create(): ParserAPI;
	/**
	 * Parses and evaluates Nerdamer notation with optional substitutions.
	 * @param str - Nerdamer notation or expression-compatible input.
	 * @param values - Values substituted by name while parsing.
	 */
	evaluate(str: string, values?: ParserValuesObject): ParserEntity;
	/**
	 * Returns one shared parser setting with the value type associated with that setting.
	 */
	get<K extends keyof SettingsType>(setting: K): SettingsType[K];
	/** Returns the symbol currently used for the imaginary unit. */
	getI(): string;
	/** Returns the active Decimal precision. */
	getPrecision(): number;
	/**
	 * Parses Nerdamer notation with optional substitutions.
	 * @param str - Nerdamer notation or expression-compatible input.
	 * @param values - Values substituted by name while parsing.
	 */
	parse(str: ExpressionInput, values?: ParserValuesObject): ParserEntity;
	/**
	 * Temporarily changes one Boolean parser setting while a callback runs.
	 * @param setting - Boolean setting name to change.
	 * @param value - Temporary value for that setting.
	 * @param callback - Work to perform before restoring the previous setting.
	 */
	scopedBlock<K extends BooleanSettingName>(
		setting: K,
		value: SettingsType[K],
		callback: () => ParserEntity
	): ParserEntity;
	/**
	 * Changes one shared parser setting and returns the parser for chaining.
	 * @param setting - Supported parser setting name.
	 * @param value - Value associated with that setting.
	 */
	set<K extends keyof SettingsType>(setting: K, value: SettingsType[K]): ParserAPI;
	/**
	 * Changes several supported parser settings and returns the parser for chaining.
	 * @param settings - Partial set of supported parser settings.
	 */
	set(settings: Partial<SettingsType>): ParserAPI;
	/**
	 * Registers or removes parser constants.
	 * @param constants - Constant names mapped to values or deletion markers.
	 */
	setConstants(constants: ParserConstants): void;
	/**
	 * Changes the symbol used for the imaginary unit.
	 * @param variable - New imaginary-unit symbol.
	 */
	setI(variable: string): ParserAPI;
	/**
	 * Alias for {@link ParserAPI.setI}.
	 * @param variable - New imaginary-unit symbol.
	 */
	setImaginary(variable: string): ParserAPI;
	/**
	 * Changes the Decimal precision used by numerical calculations.
	 * @param precision - Significant decimal digits to retain.
	 */
	setPrecision(precision: number): void;
}

/**
 * Shared parser exposed through the supported high-level interface.
 *
 * The implementation accepts a broader compatibility settings bag; this facade exposes
 * only the named settings defined by {@link SettingsType}.
 */
export const Parser = InternalParser as ParserAPI;

export type {
	JsFunction,
	Operation,
	OptionValue,
	OptionsObject,
	ParserConstants,
	ParserValuesObject,
	PostFixFunction,
	PreFixFunction,
} from '../core/classes/parser/types';
export type {
	BinaryArithmeticOperation,
	ComparisonOperation,
	Operator,
	OperatorAction,
	OperatorDefinition,
} from '../core/common/common';
export type { Language } from '../core/errors';
export type { SettingsType } from '../core/Settings';
