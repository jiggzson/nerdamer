/** Canonical names of supported built-in functions. */
// Functions
export const FACTORIAL = 'fact';
export const DOUBLE_FACTORIAL = 'dfact';
export const FIB = 'fib';
export const SQRT = 'sqrt';
export const ABS = 'abs';
export const MOD = 'mod';
export const GAMMA = 'gamma';
export const GAMMA_INCOMPLETE = 'gamma_incomplete';
export const GAMMA_INCOMPLETE_LOWER = 'gamma_incomplete_lower';
export const DIRAC = 'delta';
export const HEAVISIDE = 'heaviside';
export const LOG = 'log';
export const SGN = 'sign';
export const CSGN = 'csgn';
export const CBRT = 'cbrt';
export const CEIL = 'ceil';
export const CHI = 'Chi';
export const CI = 'Ci';
export const CONJUGATE = 'conjugate';
export const CONTAINS = 'contains';
export const CONTENT = 'content';
export const COUNT = 'count';
export const CROSS = 'cross';
export const DEFINT = 'defint';
export const DEG = 'deg';
export const DIFF = 'diff';
export const DOT_PRODUCT = 'dot';
export const EI = 'Ei';
export const ERF = 'erf';
export const FACTOR = 'factor';
export const PFACTOR = 'pfactor';
export const PFACTORD = 'pfactord';
export const FLOOR = 'floor';
export const FRESNEL_C = 'C';
export const FRESNEL_S = 'S';
export const GCD = 'gcd';
export const ILAPLACE = 'ilaplace';
export const IMAGPART = 'imagpart';
export const IMATRIX = 'imatrix';
export const INTEGRATE = 'integrate';
export const ISPRIME = 'isprime';
export const LAPLACE = 'laplace';
export const LI = 'Li';
export const LIMIT = 'limit';
export const LN = 'ln';
export const MAX = 'max';
export const MIN = 'min';
export const MEDIAN = 'median';
export const MODE = 'mode';
export const NTHROOT = 'nthroot';
export const PRODUCT_FUNCTION = 'product';
export const REALPART = 'realpart';
export const ROUND = 'round';
export const RECT = 'rect';
export const STEP = 'step';
export const TRI = 'tri';
export const SIZE = 'size';
export const TRUNC = 'trunc';
export const SHI = 'Shi';
export const SI = 'Si';
export const SINC = 'sinc';
export const SUM_FUNCTION = 'sum';

// Trigonometric functions
export const TRIG_FUNCTION_NAMES = Object.freeze({
	COS: 'cos',
	SIN: 'sin',
	TAN: 'tan',
	SEC: 'sec',
	CSC: 'csc',
	COT: 'cot',
	ACOS: 'acos',
	ASIN: 'asin',
	ATAN: 'atan',
	ASEC: 'asec',
	ACSC: 'acsc',
	ACOT: 'acot',
	ATAN2: 'atan2',
	SINH: 'sinh',
	COSH: 'cosh',
	TANH: 'tanh',
	SECH: 'sech',
	CSCH: 'csch',
	COTH: 'coth',
	ACOSH: 'acosh',
	ASINH: 'asinh',
	ATANH: 'atanh',
	ASECH: 'asech',
	ACSCH: 'acsch',
	ACOTH: 'acoth',
} as const);

export const {
	COS,
	SIN,
	TAN,
	ASIN,
	ACOS,
	SEC,
	CSC,
	COT,
	ATAN,
	ASEC,
	ACSC,
	ACOT,
	ATAN2,
	SINH,
	COSH,
	TANH,
	SECH,
	CSCH,
	COTH,
	ACOSH,
	ASINH,
	ATANH,
	ASECH,
	ACSCH,
	ACOTH,
} = TRIG_FUNCTION_NAMES;

export const TRIG = Object.freeze([COS, SIN, TAN, SEC, CSC, COT] as const);
export const INVERSE_TRIG = Object.freeze([ACOS, ASIN, ATAN, ASEC, ACSC, ACOT] as const);
export const HYPERBOLIC_TRIG = Object.freeze([COSH, SINH, TANH, SECH, CSCH, COTH] as const);
export const INVERSE_HYPERBOLIC_TRIG = Object.freeze([ACOSH, ASINH, ATANH, ASECH, ACSCH, ACOTH] as const);

/**
 * Fixed parser spellings of the built-in statistics functions.
 * This is a name classification, not a view of runtime registrations.
 */
export const STATISTICS = Object.freeze([
	'mean', MEDIAN, MODE, 'smpvar', 'variance', 'smpstdev', 'stdev', 'zscore',
] as const);

/**
 * Built-in primality, divisibility, modular-arithmetic and prime-factor operations.
 * Does not include general polynomial factorization or sequence/combinatorics helpers.
 */
export const NUMBER_THEORY = Object.freeze([
	ISPRIME, GCD, 'lcm', MOD, 'modinv', PFACTOR, PFACTORD,
] as const);

/**
 * Built-in special-function family registered by the special-function dispatch.
 * Names are case-sensitive: Shi, Si, Chi, Ci, Ei and Li are not lowercase aliases.
 */
export const SPECIAL_FUNCTIONS = Object.freeze([
	ERF, 'erfc', GAMMA, GAMMA_INCOMPLETE, GAMMA_INCOMPLETE_LOWER, SINC,
	SHI, SI, CHI, CI, EI, LI,
] as const);

