export type SettingsType = {
    //Enables/Disables call peekers. False means callPeekers are disabled and true means callPeekers are enabled.
    callPeekers: boolean,

    //the max number up to which to cache primes. Making this too high causes performance issues
    init_primes: number,

    exclude: string[],
    //If you don't care about division by zero for example then this can be set to true.
    //Has some nasty side effects so choose carefully.
    suppress_errors: boolean,
    //the global used to invoke the libary to parse to a number. Normally cos(9) for example returns
    //cos(9) for convenience but parse to number will always try to return a number if set to true.
    PARSE2NUMBER: boolean,
    //this flag forces the a clone to be returned when add, subtract, etc... is called
    SAFE: boolean,
    //the symbol to use for imaginary symbols
    IMAGINARY: string,
    //the modules used to link numeric function holders
    FUNCTION_MODULES: object[],
    //Allow certain characters
    ALLOW_CHARS: string[],
    //Allow nerdamer to convert multi-character variables
    USE_MULTICHARACTER_VARS: boolean,
    //Allow changing of power operator
    POWER_OPERATOR: string,
    //The variable validation regex
    //VALIDATION_REGEX: /^[a-z_][a-z\d\_]*$/i
    VALIDATION_REGEX: RegExp,
    // The regex used to determine which characters should be included in implied multiplication
    IMPLIED_MULTIPLICATION_REGEX: RegExp,
    //Aliases
    ALIASES: Record<string, string>,
    POSITIVE_MULTIPLIERS: boolean,
    //Cached items
    CACHE: any,
    //Print out warnings or not
    SILENCE_WARNINGS: boolean,
    //Precision
    PRECISION: number,
    //function mappings
    VECTOR: string,
    PARENTHESIS: string,
    SQRT: string,
    ABS: string,
    FACTORIAL: string,
    DOUBLEFACTORIAL: string,
    //reference pi and e
    LONG_PI: string,
    LONG_E: string,
    PI: number,
    E: number,
    LOG: string,
    LOG10: string,
    LOG10_LATEX: string,
    LOG_FNS: {
        'log': any,
        'log10': any
    },
    MAX_EXP: number,
    //The number of scientific place to round to
    SCIENTIFIC_MAX_DECIMAL_PLACES: number,
    //True if ints should not be converted to
    SCIENTIFIC_IGNORE_ZERO_EXPONENTS: boolean,

    CONST_HASH: string,

/// SOLVE

    // The search radius for the roots
    SOLVE_RADIUS: number,
    // The maximum number to fish for on each side of the zero
    ROOTS_PER_SIDE: number,
    // Covert the number to multiples of pi if possible
    make_pi_conversions: boolean,
    // The step size
    STEP_SIZE: number,
    // The epsilon size
    EPSILON: number,
    //the maximum iterations for Newton's method
    MAX_NEWTON_ITERATIONS: number,
    //the maximum number of time non-linear solve tries another jump point
    MAX_NON_LINEAR_TRIES: number,
    //the amount of iterations the function will start to jump at
    NON_LINEAR_JUMP_AT: number,
    //the size of the jump
    NON_LINEAR_JUMP_SIZE: number,
    //the original starting point for nonlinear solving
    NON_LINEAR_START: number,
    //When points are generated as starting points for Newton's method, they are sliced into small
    //slices to make sure that we have convergence on the right point. This defines the
    //size of the slice
    NEWTON_SLICES: number,
    //The epsilon used in Newton's iteration
    NEWTON_EPSILON: number,
    //The distance in which two solutions are deemed the same
    SOLUTION_PROXIMITY: number,
    //Indicate wheter to filter the solutions are not
    FILTER_SOLUTIONS: boolean,
    //the maximum number of recursive calls
    MAX_SOLVE_DEPTH: number,
    // The tolerance that's considered close enough to zero
    ZERO_EPSILON: number,
    // The maximum iteration for the bisection method incase of some JS strangeness
    MAX_BISECTION_ITER: number,
    // The tolerance for the bisection method
    BI_SECTION_EPSILON: number,

    SHOW_WARNINGS: boolean,
    USE_BIG: boolean,
    E_TO_EXP: boolean,
    SYMBOLIC_MIN_MAX: boolean,
    IGNORE_E: boolean,
};

// noinspection NonAsciiCharacters
export let Settings: SettingsType = {
    //Enables/Disables call peekers. False means callPeekers are disabled and true means callPeekers are enabled.
    callPeekers: false,

    //the max number up to which to cache primes. Making this too high causes performance issues
    init_primes: 1000,

    exclude: [],
    //If you don't care about division by zero for example then this can be set to true.
    //Has some nasty side effects so choose carefully.
    suppress_errors: false,
    //the global used to invoke the libary to parse to a number. Normally cos(9) for example returns
    //cos(9) for convenience but parse to number will always try to return a number if set to true.
    PARSE2NUMBER: false,
    //this flag forces the a clone to be returned when add, subtract, etc... is called
    SAFE: false,
    //the symbol to use for imaginary symbols
    IMAGINARY: 'i',
    //the modules used to link numeric function holders
    FUNCTION_MODULES: [Math],
    //Allow certain characters
    ALLOW_CHARS: ['π'],
    //Allow nerdamer to convert multi-character variables
    USE_MULTICHARACTER_VARS: true,
    //Allow changing of power operator
    POWER_OPERATOR: '^',
    //The variable validation regex
    //VALIDATION_REGEX: /^[a-z_][a-z\d\_]*$/i
    VALIDATION_REGEX: /^[a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ∞][0-9a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ]*$/i,
    // The regex used to determine which characters should be included in implied multiplication
    IMPLIED_MULTIPLICATION_REGEX: /([+\-\/*]*[0-9]+)([a-z_αAβBγΓδΔϵEζZηHθΘιIκKλΛμMνNξΞoOπΠρPσΣτTυϒϕΦχXψΨωΩ]+[+\-\/*]*)/gi,
    //Aliases
    ALIASES: {
        'π': 'pi',
        '∞': 'Infinity'
    },
    POSITIVE_MULTIPLIERS: false,
    //Cached items
    CACHE: { roots: {} },
    //Print out warnings or not
    SILENCE_WARNINGS: false,
    //Precision
    PRECISION: 21,
    //function mappings
    VECTOR: 'vector',
    PARENTHESIS: 'parens',
    SQRT: 'sqrt',
    ABS: 'abs',
    FACTORIAL: 'factorial',
    DOUBLEFACTORIAL: 'dfactorial',
    //reference pi and e
    LONG_PI: '3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214' +
        '808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196',
    LONG_E: '2.718281828459045235360287471352662497757247093699959574966967627724076630353547594571382178525166427427466' +
        '39193200305992181741359662904357290033429526059563073813232862794349076323382988075319525101901',
    PI: Math.PI,
    E: Math.E,
    LOG: 'log',
    LOG10: 'log10',
    LOG10_LATEX: 'log_{10}',

    LOG_FNS: { log: null, log10: null },

    MAX_EXP: 200000,
    //The number of scientific place to round to
    SCIENTIFIC_MAX_DECIMAL_PLACES: 14,
    //True if ints should not be converted to
    SCIENTIFIC_IGNORE_ZERO_EXPONENTS: true,

    CONST_HASH: '#',

/// SOLVE

    // The search radius for the roots
    SOLVE_RADIUS: 1000,
    // The maximum number to fish for on each side of the zero
    ROOTS_PER_SIDE: 10,
    // Covert the number to multiples of pi if possible
    make_pi_conversions: false,
    // The step size
    STEP_SIZE: 0.1,
    // The epsilon size
    EPSILON: 1e-13,
    //the maximum iterations for Newton's method
    MAX_NEWTON_ITERATIONS: 200,
    //the maximum number of time non-linear solve tries another jump point
    MAX_NON_LINEAR_TRIES: 12,
    //the amount of iterations the function will start to jump at
    NON_LINEAR_JUMP_AT: 50,
    //the size of the jump
    NON_LINEAR_JUMP_SIZE: 100,
    //the original starting point for nonlinear solving
    NON_LINEAR_START: 0.01,
    //When points are generated as starting points for Newton's method, they are sliced into small
    //slices to make sure that we have convergence on the right point. This defines the
    //size of the slice
    NEWTON_SLICES: 200,
    //The epsilon used in Newton's iteration
    NEWTON_EPSILON: Number.EPSILON * 2,
    //The distance in which two solutions are deemed the same
    SOLUTION_PROXIMITY: 1e-14,
    //Indicate wheter to filter the solutions are not
    FILTER_SOLUTIONS: true,
    //the maximum number of recursive calls
    MAX_SOLVE_DEPTH: 10,
    // The tolerance that's considered close enough to zero
    ZERO_EPSILON: 1e-9,
    // The maximum iteration for the bisection method incase of some JS strangeness
    MAX_BISECTION_ITER: 2000,
    // The tolerance for the bisection method
    BI_SECTION_EPSILON: 1e-12,

    SHOW_WARNINGS: false,
    USE_BIG: false,
    E_TO_EXP: false,
    SYMBOLIC_MIN_MAX: false,
    IGNORE_E: false
};
