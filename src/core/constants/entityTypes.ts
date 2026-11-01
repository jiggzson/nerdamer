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
