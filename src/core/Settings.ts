import Decimal from 'decimal.js';

import {
	ALL_SYMBOL,
	DEFAULT_IMAGINARY,
	E,
	INTEGER_PARAM,
	PI_NAME,
} from './constants/symbolNames';

import type { Language } from './errors';

export type SettingsType = {
	USE_FRACTIONS: boolean;
	ALLOW_BIGINT: boolean;
	EVALUATE: boolean;
	SUBSTITUTE: boolean;
	LANGUAGE: Language;
	ALLOW_IMPLICIT_MULTIPLICATION: boolean;
	SORT_TERMS: boolean;
	DEFER_SIMPLIFICATION: boolean;
	REWRITE_SQRT: boolean;
	ALLOW_RAT_SUBS: boolean;
	IMMUTABLE_VALUE_SETS: boolean;
	USE_SINGLE_LETTER_VARIABLES: boolean;
	MAX_PRODUCT_AND_SUMMATION_ITERATION: number;
	MAX_LOOP_ITERATIONS: number;
	MAX_FACTORIAL_INPUT: number;
	MAX_DFACT_INPUT: number;
	MAX_FIB_INPUT: number;
	MAX_NUMBER_DIGITS: number;
	MAX_RADICAL_FACTOR_STEPS: number;
	USE_NATIVE_DEFINT: boolean;
	INITIALIZE_RULES: boolean;
	INDEX_BASE: number;
	TEX_PERIODIC_VAR: string;
};

export const Settings: SettingsType = {
	// Forces decimals to fractions.
	USE_FRACTIONS: true,
	// Allow bigInt to be used when numerator or denominator get huge
	ALLOW_BIGINT: true,
	// If this is true then functions and numbers will be evaluated
	EVALUATE: false,
	// If true variable substitution will be performed
	SUBSTITUTE: true,
	// The language being used
	LANGUAGE: 'eng',
	// Allows implicit multiplications
	ALLOW_IMPLICIT_MULTIPLICATION: true,
	// If true the terms will be sorted. The default is false because of the added overhead.
	SORT_TERMS: false,
	// Avoids certain simplifications if set to false for performance boots
	DEFER_SIMPLIFICATION: false,
	// If true powers of 1/2 will be rewritten back to sqrt
	REWRITE_SQRT: true,
	// If set to false then rational multipliers will not be allowed in substitutions
	ALLOW_RAT_SUBS: false,
	// If set to true, vectors, matrices, and collections will always return a copy
	IMMUTABLE_VALUE_SETS: true,
	// If true each letter will be treated a a variable
	USE_SINGLE_LETTER_VARIABLES: false,
	// The maximum iteration allowed in sum and product. Terms are combined in balanced pairs, so
	// at the default the slowest symbolic terms measured take about 3 s (x^k+1 in a product).
	MAX_PRODUCT_AND_SUMMATION_ITERATION: 2e4,
	// The maximum number of completed iterations allowed for parser control-flow loops. It stops
	// a loop that never ends; a trivial body reaches it in about 1 s.
	MAX_LOOP_ITERATIONS: 1e6,
	// The largest exact integer input for factorial and gamma, so that n! stays within
	// MAX_NUMBER_DIGITS (25000! has 99,094 digits; about 0.1 s).
	MAX_FACTORIAL_INPUT: 2.5e4,
	// The largest exact integer input for the double factorial (45000!! has 94,929 digits)
	MAX_DFACT_INPUT: 4.5e4,
	// The largest exact integer index for the Fibonacci function (F(450000) has 94,045 digits)
	MAX_FIB_INPUT: 4.5e5,
	// The most digits an exact number may have: the decimal exponent (either sign) of a numerical
	// result stored as an exact number, and the size of an exact power. Building one is fast;
	// the bound is set by arithmetic on two such numbers, whose gcd takes about 2.5 s at the
	// default (about 0.04 s for one large and one small).
	MAX_NUMBER_DIGITS: 1e5,
	// The most Pollard rho steps spent on each factor when simplifying a radical of an exact
	// integer. A factor that resists is left under the radical (about 50 ms per factor).
	MAX_RADICAL_FACTOR_STEPS: 5e3,
	// If true, defint integrates numerically with native JS numbers (about 16 digits, a few ms)
	// instead of Decimal arithmetic at the configured precision (typically 2-40 ms).
	USE_NATIVE_DEFINT: false,
	// If true then rules will be initialized on start
	INITIALIZE_RULES: true,
	// The base index for element access on vectors and matrices. 0 = zero-based, 1 = one-based.
	INDEX_BASE: 0,
	// The name TeX output shows for the integer parameter _n of periodic solutions, which would
	// otherwise render as a subscript. Text output and computation keep _n.
	TEX_PERIODIC_VAR: 'n',
};

/**
 * Allows for the parser to run with a desired setting for a single call
 *
 * @param setting The setting to modified for the call
 * @param value The value of the setting under which the function is called
 * @param callback The function to be called
 * @returns The result of the call
 */
export function scopedBlock<T>(setting: string, value: boolean, callback: () => T): T {
	let retval: T;
	// Store the value being currently used
	const currentSettingValue = (Settings as Record<string, unknown>)[setting];
	// Update the setting to the desired value
	(Settings as Record<string, unknown>)[setting] = value;
	try {
		retval = callback();
	} finally {
		// Restore the value even if the callback throws
		(Settings as Record<string, unknown>)[setting] = currentSettingValue;
	}

	return retval;
}

/**
 * Runs a calculation with the Decimal precision raised to at least `precision`, as
 * {@link scopedBlock} does for a setting. The precision is never lowered, so a user working
 * above `precision` keeps theirs, and the precision in effect before the call is restored
 * afterwards, even if the callback throws.
 *
 * Code inside the block must not cache Decimal values or read `Decimal.precision` as the
 * user's precision: it is the working precision there.
 *
 * @param precision The minimum working precision, in significant digits
 * @param callback The calculation
 * @returns The result of the calculation
 */
export function precisionBlock<T>(precision: number, callback: () => T): T {
	let retval: T;
	const previous = Decimal.precision;
	Decimal.set({ precision: Math.max(previous, precision) });
	try {
		retval = callback();
	} finally {
		Decimal.set({ precision: previous });
	}

	return retval;
}

// The list of restricted variables
export const RESTRICTED: string[] = [E, PI_NAME, DEFAULT_IMAGINARY, INTEGER_PARAM, ALL_SYMBOL];
// The list of special values that get ignore at substitution
export const SPECIAL: string[] = [E, PI_NAME];
