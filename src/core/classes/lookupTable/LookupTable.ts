import { Pattern } from '../../converters/Pattern';

import type { Expression } from '../expression/Expression';

export type TableEntryHandler = (f: Pattern, depth?: number) => Expression | undefined;
export type TableEntries = Record<string, TableEntryHandler>;

export class LookupTable {
	private _entries: Map<string, TableEntryHandler[]> = new Map();

	public addEntries(table: TableEntries) {
		for (const pattern in table) {
			// Get the handler in the table
			const handler = table[pattern];
			this.addEntry(pattern, handler);
		}
	}

	public addEntry(pattern: string, handler: TableEntryHandler) {
		// Check if there's an existing entry
		const existingEntry = this._entries.get(pattern);
		// If not then just add it
		if (!existingEntry) {
			this._entries.set(pattern, [handler]);
		}
		// Add the handler if there's an existing entry
		else {
			existingEntry.push(handler);
		}
	}

	public get(pattern: string) {
		return this._entries.get(pattern);
	}

	public lookup(expression: Expression, x: string, depth?: number) {
		const pattern = new Pattern(expression, [x]);
		// Get the handlers
		const handlers = this.get(pattern.patternString);
		// console.log('Looking up\n');
		// console.log(
		// 	`pattern: ${pattern.patternString}, expression: ${expression}, handler found: ${handlers ? handlers.length : 'none'}\n`
		// );
		if (handlers) {
			// If there are handlers then try each one until a match is found.
			for (const handler of handlers) {
				const result = handler(pattern, depth);
				if (result) {
					return result;
				}
			}
		}

		return undefined;
	}

	public set(pattern: string, handler: TableEntryHandler) {
		const handlers = this._entries.get(pattern);
		if (handler) {
			handlers?.push(handler);
			return true;
		}
		return false;
	}
}
