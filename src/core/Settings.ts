type SettingsType = {
	USE_FRACTIONS: boolean;
	ALLOW_BIGINT: boolean;
	EVALUATE: boolean;
	SUBSTITUTE: boolean;
	LANGUAGE: string;
	ALLOW_IMPLICIT_MULTIPLICATION: boolean;
	SORT_TERMS: boolean;
	DEFER_SIMPLIFICATION: boolean;
	REWRITE_SQRT: boolean;
	MAX_FRAC_INT: bigint;
	ALLOW_RAT_SUBS: boolean;
	IMMUTABLE_VALUE_SETS: boolean;
	USE_SINGLE_LETTER_VARIABLES: boolean;
	MAX_PRODUCT_AND_SUMMATION_ITERATION: number;
	INITIALIZE_RULES: boolean;
	INDEX_BASE: number;
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
	// The max allowable integer when factoring numerators and denominator
	MAX_FRAC_INT: BigInt(1e60),
	// If set to false then rational multipliers will not be allowed in substitutions
	ALLOW_RAT_SUBS: false,
	// If set to true, vectors, matrices, and collections will always return a copy
	IMMUTABLE_VALUE_SETS: true,
	// If true each letter will be treated a a variable
	USE_SINGLE_LETTER_VARIABLES: false,
	// The maximum iteration allowed in sum and product
	MAX_PRODUCT_AND_SUMMATION_ITERATION: 1e4,
	// If true then rules will be initialized on start
	INITIALIZE_RULES: true,
	// The base index for element access on vectors and matrices. 0 = zero-based, 1 = one-based.
	INDEX_BASE: 0,
};

// The list of restricted variables
export const RESTRICTED: string[] = ['e', 'pi', 'i', '_n'];
// The list of special values that get ignore at substitution
export const SPECIAL: string[] = ['e', 'pi'];
