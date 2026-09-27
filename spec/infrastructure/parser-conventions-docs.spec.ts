import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('parser conventions documentation', () => {
	const guide = readFileSync(
		resolve(__dirname, '../../docs/PARSER_CONVENTIONS.md'),
		'utf8'
	);

	it('covers the reserved parser and solver names tracked by issue 36', () => {
		for (const name of ['`e`', '`pi`', '`i`', '`_n`', '`all`']) {
			expect(guide).toContain(name);
		}

		expect(guide).toContain('Parser.isReserved');
		expect(guide).toContain('nerdamer.isReserved');
		expect(guide).toContain('Parser.setI');
	});

	it('explains the internal EXP power-node convention', () => {
		expect(guide).toContain('internal `EXP`');
		expect(guide).toContain('structural power node');
		expect(guide).toContain('(-x)^(1/2)');
		expect(guide).toContain('not synonymous with the mathematical exponential function');
	});
});
