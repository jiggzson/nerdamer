type SettingsType = {
    USE_FRACTIONS: boolean;
    ALLOW_BIGINT: boolean;
    EVALUATE: boolean;
    LANGUAGE: string;
    ALLOW_IMPLICIT_MULTIPLICATION: boolean;
    SORT_TERMS: boolean;
    DEFER_SIMPLIFICATION: boolean;
    REWRITE_SQRT: boolean;
    MAX_FRAC_INT: bigint;
    ALLOW_RAT_SUBS: boolean;
    IMMUTABLE_VALUE_SETS: boolean;
    USE_SINGLE_LETTER_VARIABLES: boolean;
}

export const Settings: SettingsType= {
    // Forces decimals to fractions. 
    USE_FRACTIONS: true,
    // Allow bigInt to be used when numerator or denominator get huge
    ALLOW_BIGINT: true,
    // If this is true then functions and numbers will be evaluated
    EVALUATE: false,
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
    USE_SINGLE_LETTER_VARIABLES: false
}