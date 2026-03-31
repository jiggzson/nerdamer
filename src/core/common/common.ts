export interface Base<Type> {
	dataType: string;
	isEnumerable: boolean;
	text: () => void;
	copy: () => Type;
}
/**
 * The supported operator actions
 */
export type OperatorAction =
	| 'dot'
	| 'doubleFactorial'
	| 'factorial'
	| 'pow'
	| 'mod'
	| 'times'
	| 'div'
	| 'minus'
	| 'plus'
	| 'setEqual'
	| 'eq'
	| 'lt'
	| 'lte'
	| 'gt'
	| 'gte'
	| 'mapTo'
	| 'comma'
	| 'assign'
	| 'functionAssign'
	| 'in';
export type Operator = {
	// The operator precedence
	precedence: number;
	// The value of the operator e.g. +, -, *, ...
	operator: string;
	// The action that this operator maps to
	action: OperatorAction;
	// True if it's a prefix operator
	isPrefix: boolean;
	// True if it's postfix operator
	isPostfix: boolean;
	// True if it's left associative
	leftAssoc: boolean;
	// True if the function iterates over elements of the object
	iterates: boolean;
	// The function it maps to if it's an assertive operator call
	assertiveAction?: string;
};

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

export const operators: { [key: string]: Operator } = {
	'.': {
		precedence: 9,
		operator: '.',
		action: 'dot',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	'!!': {
		precedence: 7,
		operator: '!!',
		action: 'doubleFactorial',
		isPrefix: false,
		isPostfix: true,
		leftAssoc: true,
		iterates: true,
	},
	'!': {
		precedence: 7,
		operator: '!',
		action: 'factorial',
		isPrefix: false,
		isPostfix: true,
		leftAssoc: true,
		iterates: true,
	},
	'^': {
		precedence: 6,
		operator: '^',
		action: 'pow',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
	},
	'**': {
		precedence: 6,
		operator: '**',
		action: 'pow',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: true,
	},
	'%': {
		precedence: 4,
		operator: '%',
		action: 'mod',
		isPrefix: false,
		isPostfix: true,
		leftAssoc: true,
		iterates: true,
	},
	'*': {
		precedence: 4,
		operator: '*',
		action: 'times',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: true,
	},
	'/': {
		precedence: 4,
		operator: '/',
		action: 'div',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: true,
	},
	'+': {
		precedence: 3,
		operator: '+',
		action: 'plus',
		isPrefix: true,
		isPostfix: false,
		leftAssoc: false,
		iterates: true,
	},
	'-': {
		precedence: 3,
		operator: '-',
		action: 'minus',
		isPrefix: true,
		isPostfix: false,
		leftAssoc: false,
		iterates: true,
	},
	'=': {
		precedence: 2,
		operator: '=',
		action: 'setEqual',
		assertiveAction: 'assertEQ',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'==': {
		precedence: 1,
		operator: '==',
		action: 'eq',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'<': {
		precedence: 1,
		operator: '<',
		action: 'lt',
		assertiveAction: 'assertLT',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'<=': {
		precedence: 1,
		operator: '<=',
		action: 'lte',
		assertiveAction: 'assertLTE',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'>': {
		precedence: 1,
		operator: '>',
		action: 'gt',
		assertiveAction: 'assertGT',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'>=': {
		precedence: 1,
		operator: '>=',
		action: 'gte',
		assertiveAction: 'assertGTE',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	'=>': {
		precedence: 0,
		operator: '=>',
		action: 'mapTo',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	',': {
		precedence: 0,
		operator: ',',
		action: 'comma',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	':': {
		precedence: 0,
		operator: ',',
		action: 'assign',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
	':=': {
		precedence: 0,
		operator: ',',
		action: 'functionAssign',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: true,
		iterates: false,
	},
	in: {
		precedence: 0,
		operator: ',',
		action: 'in',
		isPrefix: false,
		isPostfix: false,
		leftAssoc: false,
		iterates: false,
	},
};

export const ASSERTIVE_FUNCTIONS = ['assume'];
