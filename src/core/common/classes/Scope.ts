import { SCOPE } from '../../classes/parser/constants';

import type { Token } from '../../classes/parser/Token';

export class Scope extends Array<Scope | Token> {
	/**
	 * The column at which the scope was encountered
	 */
	column: number;
	dataType: string;

	/**
	 * The current depth of the scope.
	 */
	depth: number = 0;

	/**
	 * If true, the tokenizer would have inserted implicit multiplication before this scope
	 * but deferred the decision to parseRPN (e.g. for square brackets where it could be
	 * either indexing or multiplication depending on the resolved type).
	 */
	implicitMultiply: boolean = false;

	/**
	 * If the scope was properly closed then this should be closed.
	 */
	isOpen: boolean = false;

	/**
	 * The parent of the current scope
	 */
	parent?: Scope;

	/**
	 * The scope type, parentheses, or square, or curly, or pipe.
	 * This will be used to determine what it maps to during parsing.
	 */
	type: string;

	constructor(type: string, column: number, parent?: Scope) {
		super();

		this.dataType = SCOPE;
		// The column where this scope was encountered
		this.column = column;
		// Scopes typically map to something
		this.type = type;
		// A temporary link to the parent of the parent scope;
		this.parent = parent;
	}

	/**
	 * Adds a nested scope to the current scope and then returns it, essentially
	 * pointing to the new scope.
	 *
	 * @param column The column number at which the scope was encountered
	 * @param type
	 * @returns
	 */
	addScope(type: string, column: number) {
		// Yup a circular reference but should be easy to understand.
		const scope = new Scope(type, column, this);
		// Mark that this is one scope deeper than this one.
		scope.depth = this.depth + 1;
		// Mark it as open
		scope.isOpen = true;
		// Add it to the current scope
		this.push(scope);
		return scope;
	}

	text(valuesOnly: boolean = true) {
		return this.map(token => {
			// Call scope recursively
			if (token instanceof Scope) {
				const scopedStr = token.text(valuesOnly);
				// Put back the parenthesis
				switch (token.type) {
					case 'parenthesis':
						return `( ${scopedStr} )`;
					case 'square':
						return `[ ${scopedStr} ]`;
					case 'curly':
						return `{ ${scopedStr} }`;
					case 'pipe':
						return `| ${scopedStr} |`;
					default:
						return scopedStr;
				}
			} else {
				if (valuesOnly) {
					return token.toString();
				}
				return `<${token.toString()}, ${token.type}>`;
			}
		})
			.join(valuesOnly ? ' ' : ', ')
			.replace(/\s+/gi, ' ');
	}

	/**
	 * This essentially removes the scope and then returns the current scope,
	 * essentially going back up to the previous scope.
	 *
	 * @returns The current scope
	 */
	upperScope() {
		// Close the bracket
		this.isOpen = false;

		const parent = this.parent;
		// This reference is no longer needed. This isn't critical but helps a little with cleanup.
		delete this.parent;

		return parent;
	}
}
