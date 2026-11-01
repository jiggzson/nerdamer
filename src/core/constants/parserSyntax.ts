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

// Internal function name used to carry symbolic bracket access inside an Expression.
export const SYMBOLIC_ACCESSOR = '__accessor__';

// Assertive parser functions are recognized specially by the token evaluation path.
export const ASSERTIVE_FUNCTIONS: readonly string[] = Object.freeze(['assume']);
