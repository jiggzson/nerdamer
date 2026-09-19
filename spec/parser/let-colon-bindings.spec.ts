import nerdamer from '../../src';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('LET colon-binding regressions', () => {
	it('accepts colon bindings and restores the previous parser values', () => {
		const x = 'let_colon_x';
		const y = 'let_colon_y';
		const hadX = Object.prototype.hasOwnProperty.call(Parser.KNOWN_VALUES, x);
		const hadY = Object.prototype.hasOwnProperty.call(Parser.KNOWN_VALUES, y);
		const previousX = Parser.KNOWN_VALUES[x];
		const previousY = Parser.KNOWN_VALUES[y];

		delete Parser.KNOWN_VALUES[x];
		delete Parser.KNOWN_VALUES[y];

		try {
			const result = nerdamer(`
				let(${x}:2, ${y}:3,
					return ${x}*${y};
				)
			`);

			expect(result.text()).toEqual('6');
			expect(Parser.parse(x).text()).toEqual(x);
			expect(Parser.parse(y).text()).toEqual(y);
		} finally {
			if (hadX) {
				Parser.KNOWN_VALUES[x] = previousX;
			} else {
				delete Parser.KNOWN_VALUES[x];
			}
			if (hadY) {
				Parser.KNOWN_VALUES[y] = previousY;
			} else {
				delete Parser.KNOWN_VALUES[y];
			}
		}
	});

	it('evaluates later colon-binding values after earlier locals are installed', () => {
		const x = 'let_colon_sequential_x';
		const y = 'let_colon_sequential_y';

		delete Parser.KNOWN_VALUES[x];
		delete Parser.KNOWN_VALUES[y];

		try {
			const result = nerdamer(`let(${x}:2,${y}:${x}+1,${x}*${y})`);

			expect(result.text()).toEqual('6');
			expect(Parser.parse(x).text()).toEqual(x);
			expect(Parser.parse(y).text()).toEqual(y);
		} finally {
			delete Parser.KNOWN_VALUES[x];
			delete Parser.KNOWN_VALUES[y];
		}
	});

	it('keeps positional bindings compatible beside colon bindings', () => {
		const x = 'let_colon_compat_x';
		const y = 'let_colon_compat_y';

		delete Parser.KNOWN_VALUES[x];
		delete Parser.KNOWN_VALUES[y];

		try {
			expect(nerdamer(`let(${x},2,${y},3,${x}*${y})`).text()).toEqual('6');
			expect(nerdamer(`let(${x}:2,${y}:3,${x}*${y})`).text()).toEqual('6');
		} finally {
			delete Parser.KNOWN_VALUES[x];
			delete Parser.KNOWN_VALUES[y];
		}
	});
});
