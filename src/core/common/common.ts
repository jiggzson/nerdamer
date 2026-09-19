export interface Base<Type> {
	dataType: string;
	isEnumerable: boolean;
	text: () => string;
	copy: () => Type;
}

/**
 * Checks Nerdamer's runtime data-type discriminator without importing a concrete class.
 *
 * Class-specific guards such as `Matrix.isMatrix` should remain the normal call site when
 * that class can be imported safely. This lower-level check backs those guards and provides
 * the same discriminator in code where a concrete import would introduce a cycle.
 */
export function isNerdamerNativeType(obj: unknown, dataType: string): boolean {
	let retval = false;
	if (typeof obj === 'object' && obj !== null && 'dataType' in obj) {
		retval = obj.dataType === dataType;
	}
	return retval;
}

/**
 * The supported operator actions
 */
export type BinaryArithmeticOperation = 'pow' | 'times' | 'div' | 'minus' | 'plus';
export type ComparisonOperation = 'eq' | 'lt' | 'lte' | 'gt' | 'gte';

export type OperatorAction =
	| 'dot'
	| 'doubleFactorial'
	| 'factorial'
	| 'mod'
	| 'percent'
	| BinaryArithmeticOperation
	| 'setEqual'
	| ComparisonOperation
	| 'mapTo'
	| 'comma'
	| 'assign'
	| 'functionAssign'
	| 'in';

/**
 * Operator metadata accepted by the parser registry.
 *
 * Registration accepts custom action names and the legacy `prefix`/`postfix` aliases.
 * Prefix, postfix, and iteration flags are optional because the parser supplies defaults.
 */
export interface OperatorDefinition {
	// The operator precedence
	precedence: number;
	// The value of the operator e.g. +, -, *, ...
	operator: string;
	// The dispatch name used by this operator. Custom operators may register custom actions.
	action: string;
	// True if it's a prefix operator
	isPrefix?: boolean;
	// True if it's postfix operator
	isPostfix?: boolean;
	// True if it's left associative
	leftAssoc: boolean;
	// True if the function iterates over elements of the object
	iterates?: boolean;
	// Legacy alias for isPrefix.
	prefix?: boolean;
	// Legacy alias for isPostfix.
	postfix?: boolean;
	// The function it maps to if it's an assertive operator call
	assertiveAction?: string;
	// Preserve ambiguous left-hand syntax until this operator is evaluated.
	deferLHSResolution?: boolean;
	// Preserve the right-hand expression as a deferred parser callback until this operator is evaluated.
	deferRHSResolution?: boolean;
	// Alternate postfix interpretation when the following syntax terminates the left operand.
	postfixVariant?: Operator;
}

/** Fully normalized operator metadata stored by the parser. */
export interface Operator extends OperatorDefinition {
	isPrefix: boolean;
	isPostfix: boolean;
	iterates: boolean;
	prefix?: never;
	postfix?: never;
}

export interface Bracket {
	type: string;
	id: number;
	isOpen: boolean;
	isClose: boolean;
	matches: string;
}

export const brackets: { [key: string]: Bracket } = {
	'(': {
		type: 'parenthesis',
		id: 1,
		isOpen: true,
		isClose: false,
		matches: ')',
	},
	')': {
		type: 'parenthesis',
		id: 2,
		isOpen: false,
		isClose: true,
		matches: '(',
	},
	'[': {
		type: 'square',
		id: 3,
		isOpen: true,
		isClose: false,
		matches: ']',
	},
	']': {
		type: 'square',
		id: 4,
		isOpen: false,
		isClose: true,
		matches: '[',
	},
	'{': {
		type: 'curly',
		id: 5,
		isOpen: true,
		isClose: false,
		matches: '}',
	},
	'}': {
		type: 'curly',
		id: 6,
		isOpen: false,
		isClose: true,
		matches: '{',
	},
	'|': {
		type: 'pipe',
		id: 7,
		isOpen: true,
		isClose: true,
		matches: '|',
	},
};

export const operators: Record<string, Operator & { action: OperatorAction }> = {
	'.': {
		precedence: 9,
		operator: '.',
		action: 'dot',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'!!': {
		precedence: 7,
		operator: '!!',
		action: 'doubleFactorial',
		isPrefix: false,
		isPostfix: true,
		leftAssoc: false,
		iterates: true,
	},
	'!': {
		precedence: 7,
		operator: '!',
		action: 'factorial',
		isPrefix: false,
		isPostfix: true,
		leftAssoc: false,
		iterates: true,
	},
	'^': {
		precedence: 6,
		operator: '^',
		action: 'pow',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: true,
	},
	'**': {
		precedence: 6,
		operator: '**',
		action: 'pow',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: true,
	},
	'%': {
		precedence: 4,
		operator: '%',
		action: 'mod',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
		postfixVariant: {
			precedence: 7,
			operator: '%',
			action: 'percent',
			isPrefix: false,
			isPostfix: true,
			leftAssoc: false,
			iterates: true,
		},
	},
	'*': {
		precedence: 4,
		operator: '*',
		action: 'times',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
	},
	'/': {
		precedence: 4,
		operator: '/',
		action: 'div',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
	},
	'+': {
		precedence: 3,
		operator: '+',
		action: 'plus',
		isPrefix: true,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
	},
	'-': {
		precedence: 3,
		operator: '-',
		action: 'minus',
		isPrefix: true,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
	},
	'=': {
		precedence: 2,
		operator: '=',
		action: 'setEqual',
		assertiveAction: 'assertEQ',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'==': {
		precedence: 1,
		operator: '==',
		action: 'eq',
		assertiveAction: 'assertEQ',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'<': {
		precedence: 1,
		operator: '<',
		action: 'lt',
		assertiveAction: 'assertLT',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'<=': {
		precedence: 1,
		operator: '<=',
		action: 'lte',
		assertiveAction: 'assertLTE',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'>': {
		precedence: 1,
		operator: '>',
		action: 'gt',
		assertiveAction: 'assertGT',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'>=': {
		precedence: 1,
		operator: '>=',
		action: 'gte',
		assertiveAction: 'assertGTE',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'=>': {
		precedence: 0,
		operator: '=>',
		action: 'mapTo',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	',': {
		precedence: 0,
		operator: ',',
		action: 'comma',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	':': {
		precedence: 0,
		operator: ':',
		action: 'assign',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
		deferLHSResolution: true,
	},
	':=': {
		precedence: 0,
		operator: ':=',
		action: 'functionAssign',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
		deferLHSResolution: true,
		deferRHSResolution: true,
	},
	in: {
		precedence: 0,
		operator: 'in',
		action: 'in',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
};

export const ASSERTIVE_FUNCTIONS = ['assume'];