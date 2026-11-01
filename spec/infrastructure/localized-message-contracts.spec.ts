import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

import { EnglishErrorMessages } from '../../src/core/errors';

function sourceFiles(directory: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...sourceFiles(path));
		} else if (path.endsWith('.ts')) {
			files.push(path);
		}
	}
	return files;
}

/** Checks statically named localized messages against their supplied replacement keys. */
describe('localized message call contracts', () => {
	it('supplies every named placeholder at static production call sites', () => {
		const root = resolve(__dirname, '../../src');
		const invalid: string[] = [];
		for (const path of sourceFiles(root)) {
			const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
			const visit = (node: ts.Node): void => {
				if (ts.isCallExpression(node) && node.arguments.length > 0) {
					const callee = node.expression;
					const isMessage = ts.isIdentifier(callee)
						? callee.text === 'message'
						: ts.isPropertyAccessExpression(callee) && callee.name.text === 'message';
					const keyArg = node.arguments[0];
					if (isMessage && ts.isStringLiteral(keyArg)) {
						const key = keyArg.text as keyof typeof EnglishErrorMessages;
						const template: string | undefined = EnglishErrorMessages[key];
						if (template !== undefined) {
							const required = [...template.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]);
							const values = node.arguments[1];
							if (required.length > 0 && (!values || !ts.isObjectLiteralExpression(values))) {
								invalid.push(`${relative(root, path)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${key} requires ${required.join(', ')}`);
							} else if (values && ts.isObjectLiteralExpression(values)) {
								const supplied = new Set(values.properties.flatMap(prop => {
									if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
										const name = prop.name;
										if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
											return [name.text];
										}
									}
									return [];
								}));
								for (const name of required) {
									if (!supplied.has(name)) {
										invalid.push(`${relative(root, path)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${key} missing ${name}`);
									}
								}
							}
						}
					}
				}
				ts.forEachChild(node, visit);
			};
			visit(source);
		}
		expect(invalid).toEqual([]);
	});
});
