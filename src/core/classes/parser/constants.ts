import Decimal from 'decimal.js';

/**
 * Some helper constants
 */
export const MINUS = '-';
export const PLUS = '+';
export const MULTIPLY = '*';
export const DIVIDE = '/';
export const DOT = '.';
export const COMMA = ',';
export const ASSIGN = ':';
export const SPACE = ' ';
export const BLANK = '';
export const NEWLINE = '\n';
export const TAB = '\t';
export const LINEFEED = '\f';
export const RETURN = '\r';
export const OPEN_PAREN = '(';
export const CLOSE_PAREN = ')';
export const WRAP = '';

// Data types
// export const EXPRESSION = 'EX';
export const TOKEN = 'Token';
export const INDEXED_REFERENCE = 'INDEXED_REF';
export const KEY_VALUE_PAIR = 'KEY_VALUE_PAIR';
export const RATIONAL = 'RAT';
export const SCOPE = 'SCP';
export const EXPRESSION = 'EXP';
export const COLLECTION = 'COL';
export const VECTOR = 'VEC';
export const MATRIX = 'MAT';
export const EQUATION = 'EQN';
export const POLYNOMIAL = 'POL';
export const TERM = 'TRM';
export const GFPOLY = 'GFP';
export const SET = 'SET';
export const SOLUTIONS_SET = 'SOL';
export const DICTIONARY = 'DIC';
export const ASSUMPTION = 'ASSUMPTION';

// The data type name
export const dataTypes: { [key: string]: string } = {
	[TOKEN]: 'Token',
	[INDEXED_REFERENCE]: 'IndexedReference',
	[KEY_VALUE_PAIR]: 'KeyValuePair',
	[RATIONAL]: 'Rational',
	[SCOPE]: 'Scope',
	[EXPRESSION]: 'Expression',
	[COLLECTION]: 'Collection',
	[VECTOR]: 'Vector',
	[MATRIX]: 'Matrix',
	[EQUATION]: 'Equation',
	[POLYNOMIAL]: 'Polynomial',
	[TERM]: 'Term',
	[GFPOLY]: 'GFPolynomial',
	[SET]: 'ValuesSet',
	[SOLUTIONS_SET]: 'SolutionSet',
	[DICTIONARY]: 'Dictionary',
	[ASSUMPTION]: 'Assumption',
};

/**
 * The base types supported by the parser. All other types are a form of these
 */
export const EXPRESSION_TYPES = {
	// Numbers,
	NUM: 6,
	// Any variable e.g. x
	VAR: 2,
	// An exponential
	EXP: 1,
	// Any function
	FUN: 3,
	// Any type of the same variable
	GRP: 4,
	// Any expression with terms bound by multiplication or division
	PRD: 7,
	// Any expression bound by division or subtraction
	SUM: 5,
	// Infinity
	INF: 8,
	// Vectors
	VEC: 9,
	// Matrices
	MAT: 10,
};

/**
 * The ranking used when evaluating types
 */
export const RANK: { [key: string]: number } = {
	// Numbers,
	[EXPRESSION_TYPES.NUM]: 1,
	// Any variable e.g. x
	[EXPRESSION_TYPES.VAR]: 2,
	// An exponential
	[EXPRESSION_TYPES.EXP]: 3,
	// Any function
	[EXPRESSION_TYPES.FUN]: 4,
	// Any type of the same variable
	[EXPRESSION_TYPES.GRP]: 5,
	// Any expression with terms bound by multiplication or division
	[EXPRESSION_TYPES.PRD]: 6,
	// Any expression bound by division or subtraction
	[EXPRESSION_TYPES.SUM]: 7,
	// Infinity
	[EXPRESSION_TYPES.INF]: 8,
};

// Parser Constants
export const E = 'e';
export const PI_NAME = 'pi';
export const PI_SYMBOL = 'π';
export const DEFAULT_IMAGINARY = 'i';
export const INDEX_VARIABLE = '_n';
export const ALL_SYMBOL = 'all';
export const ALIASES: Record<string, string> = {
	[PI_SYMBOL]: PI_NAME,
	'∞': 'Inf',
};
export const PI = [PI_NAME, PI_SYMBOL];
export const INFINITY = ['Inf', 'Infinity', '∞'];

// Parser Constants
export const PARSER_CONSTANTS = {
	[PI_NAME]: () => {
		return Decimal.acos(-1).toString();
	},
	[PI_SYMBOL]: () => {
		return Decimal.acos(-1).toString();
	},
	[E]: () => {
		return Decimal.exp(1).toString();
	},
};

// Functions
// Internal function name used to carry symbolic bracket access inside an Expression.
export const SYMBOLIC_ACCESSOR = '__accessor__';
export const FACTORIAL = 'fact';
export const DOUBLE_FACTORIAL = 'dfact';
export const FIB = 'fib';
export const SQRT = 'sqrt';
export const ABS = 'abs';
export const MOD = 'mod';
export const GAMMA = 'gamma';
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
export const NTHROOT = 'nthroot';
export const PRODUCT_FUNCTION = 'product';
export const REALPART = 'realpart';
export const ROUND = 'round';
export const SIZE = 'size';
export const TRUNC = 'trunc';
export const SHI = 'Shi';
export const SI = 'Si';
export const SINC = 'sinc';
export const SUM_FUNCTION = 'sum';

// Trigonometric functions
export const TRIG_FUNCTION_NAMES = {
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
};

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

export const TRIG = [COS, SIN, TAN, SEC, CSC, COT];
export const INVERSE_TRIG = [ACOS, ASIN, ATAN, ASEC, ACSC, ACOT];
export const HYPERBOLIC_TRIG = [COSH, SINH, TANH, SECH, CSCH, COTH];
export const INVERSE_HYPERBOLIC_TRIG = [ACOSH, ASINH, ATANH, ASECH, ACSCH, ACOTH];
