import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

describe('spec filename conventions', () => {
	// Keep all spec names lowercase and dash-separated, including class-focused suites.
	it('uses kebab-case for every spec filename', () => {
		const pending = [resolve('spec')];
		const invalid: string[] = [];

		while (pending.length > 0) {
			const directory = pending.pop()!;
			for (const entry of readdirSync(directory)) {
				const path = join(directory, entry);
				if (statSync(path).isDirectory()) {
					pending.push(path);
				} else if (/\.spec\.[cm]?[jt]sx?$/.test(entry) &&
					!/^[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.[cm]?[jt]sx?$/.test(entry)) {
					invalid.push(relative(resolve('.'), path).replace(/\\/g, '/'));
				}
			}
		}

		if (invalid.length > 0) {
			throw new Error(`Spec filenames must use kebab-case:\n${invalid.sort().map(name => `- ${name}`).join('\n')}`);
		}
	});
});
