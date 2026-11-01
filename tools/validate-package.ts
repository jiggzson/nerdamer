import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

interface PackageManifest {
	name: string;
	version: string;
	main?: string;
	types?: string;
	repository?: { type?: string; url?: string } | string;
	bugs?: { url?: string } | string;
	homepage?: string;
	publishConfig?: { tag?: string };
	files?: string[];
}

const ROOT = resolve(__dirname, '..');
const EXPECTED_REPOSITORY = 'git+https://github.com/jiggzson/nerdamer.git';
const EXPECTED_BUGS = 'https://github.com/jiggzson/nerdamer/issues';
const EXPECTED_HOMEPAGE = 'https://nerdamer.com';

function npmCli(): string {
	const retval = process.env.npm_execpath;
	if (!retval) throw new Error('Run package validation through npm.');
	return retval;
}

function npm(args: string[], cwd: string): string {
	return execFileSync(process.execPath, [npmCli(), ...args], {
		cwd,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'inherit'],
	}).trim();
}

function validateManifest(): void {
	const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as PackageManifest;
	const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
	const bugs = typeof manifest.bugs === 'string' ? manifest.bugs : manifest.bugs?.url;

	if (manifest.name !== 'nerdamer') throw new Error('Unexpected package name.');
	if (manifest.version !== '2.0.1') throw new Error('Package version is not set to 2.0.1.');
	if (manifest.publishConfig?.tag !== 'latest') throw new Error('Package must publish under the latest tag.');
	if (manifest.files?.some(path => path === 'docs' || path.startsWith('docs/'))) {
		throw new Error('Internal docs directory must be excluded from the published package.');
	}
	for (const path of ['README.md', 'BREAKING_CHANGES.md']) {
		const content = readFileSync(join(ROOT, path), 'utf8');
		if (/\]\((?:\.\/)?docs\//i.test(content)) {
			throw new Error(`Public ${path} links to internal docs.`);
		}
	}
	if (repository !== EXPECTED_REPOSITORY) throw new Error('Unexpected repository URL.');
	if (bugs !== EXPECTED_BUGS) throw new Error('Unexpected bugs URL.');
	if (manifest.homepage !== EXPECTED_HOMEPAGE) throw new Error('Unexpected homepage URL.');
	if (manifest.main !== 'dist/bundle.js') throw new Error('Unexpected package main entry.');
	if (manifest.types !== 'index.d.ts') throw new Error('Unexpected package type entry.');
}

function validateInstalledPackage(consumer: string): void {
	const smoke = [
		"const nerdamer = require('nerdamer');",
		"const parser = require('nerdamer/parser');",
		"const algebra = require('nerdamer/algebra');",
		"const calculus = require('nerdamer/calculus');",
		"const solve = require('nerdamer/solve');",
		"const structures = require('nerdamer/structures');",
		"const constants = require('nerdamer/constants');",
		"const statistics = require('nerdamer/statistics');",
		"const special = require('nerdamer/special');",
		"if (typeof nerdamer !== 'function') throw new Error('Package root is not callable.');",
		"if (nerdamer('x+x').text() !== '2*x') throw new Error('Package root smoke test failed.');",
		"if (typeof nerdamer.factor !== 'function' || typeof nerdamer.diff !== 'function' || typeof nerdamer.solve !== 'function') {",
		"  throw new Error('Full package root is missing algebra, calculus, or solving.');",
		"}",
		"if (nerdamer.diff('x^3', 'x').text() !== '3*x^2') throw new Error('Full package calculus failed.');",
		"if (nerdamer.solve('x^2-1', 'x').count() !== 2) throw new Error('Full package solving failed.');",
		"if (nerdamer.convertFromLaTeX('x^{2}').text() !== 'x^2') {",
		"  throw new Error('Full package LaTeX import failed.');",
		"}",
		"if (!Object.isFrozen(constants.TRIG) || !Object.isFrozen(constants.INVERSE_TRIG) ||",
		"    !Object.isFrozen(constants.HYPERBOLIC_TRIG) || !Object.isFrozen(constants.INVERSE_HYPERBOLIC_TRIG)) {",
		"  throw new Error('Public function categories are not immutable.');",
		"}",
		"if (!nerdamer('sin(x)').isFunction(constants.TRIG) ||",
		"    nerdamer('sin(x)').isFunction(constants.INVERSE_TRIG)) {",
		"  throw new Error('Public function-category classification failed.');",
		"}",
		"if (!parser.Parser || !algebra.factor || !calculus.diff || !solve.solve || !structures.Vector ||",
		"    typeof statistics.mean !== 'function' || typeof special.erf !== 'function') {",
		"  throw new Error('One or more public subpath exports are unavailable.');",
		"}",
		"if (statistics.mean(1, 2, 3).text() !== '2' || special.erf(nerdamer('0')).text() !== '0') {",
		"  throw new Error('Statistics or special function subpath failed.');",
		"}",
		"nerdamer.connect(['releasecheck'], { releasecheck: x => x * x + 1 });",
		"if (nerdamer('releasecheck(x)').text() !== 'releasecheck(x)' ||",
		"    nerdamer('releasecheck(x)').evaluate({ x: 2 }).text() !== '5' ||",
		"    nerdamer('releasecheck(x)').buildFunction(['x'])(3) !== 10) {",
		"  throw new Error('Connected numerical function failed.');",
		"}",
	].join('\n');
	const smokePath = join(consumer, 'smoke.cjs');
	writeFileSync(smokePath, smoke);
	execFileSync(process.execPath, [smokePath], { cwd: consumer, stdio: 'inherit' });
}

/** Checks TypeScript imports using the installed tarball rather than source-path aliases. */
function validateInstalledTypes(consumer: string): void {
	const source = [
		"import nerdamer = require('nerdamer');",
		"import { diff } from 'nerdamer/calculus';",
		"import { factor } from 'nerdamer/algebra';",
		"import { solve } from 'nerdamer/solve';",
		"import { Expression, type ParserEntity } from 'nerdamer/core';",
		"import { TRIG, INVERSE_TRIG } from 'nerdamer/constants';",
		"import { mean } from 'nerdamer/statistics';",
		"import { erf } from 'nerdamer/special';",
		"",
		"const result: Expression = factor('x^2-1');",
		"const derivative: Expression = diff('x^3', 'x');",
		"const roots = solve('x^2-1', 'x');",
		"const imported: ParserEntity = nerdamer.convertFromLaTeX('x^{2}');",
		"const immutableCategory: readonly string[] = TRIG;",
		"const classified: boolean = Expression.create('sin(x)').isFunction(immutableCategory);",
		"const isInverse: boolean = Expression.create('sin(x)').isFunction(INVERSE_TRIG);",
		"const average: Expression = mean(1, 2, 3);",
		"const errorValue: Expression = erf(Expression.create(0));",
		"classified.valueOf();",
		"isInverse.valueOf();",
		"nerdamer('x^2+1').text();",
		"result.text();",
		"derivative.text();",
		"roots.count();",
		"imported.text();",
		"average.text();",
		"errorValue.text();",
	].join('\n');
	writeFileSync(join(consumer, 'smoke.ts'), source);
	writeFileSync(
		join(consumer, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				strict: true,
				target: 'ES2022',
				module: 'CommonJS',
				moduleResolution: 'Node',
				esModuleInterop: true,
				skipLibCheck: true,
				noEmit: true,
			},
			files: ['smoke.ts'],
		})
	);
	execFileSync(
		process.execPath,
		[join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', join(consumer, 'tsconfig.json')],
		{ cwd: consumer, stdio: 'inherit' }
	);
}

function main(): void {
	validateManifest();

	for (const path of [
		'dist/bundle.js',
		'output/api/core.js',
		'output/api/constants.js',
		'output/api/constants.d.ts',
		'index.d.ts',
	]) {
		if (!existsSync(join(ROOT, path))) throw new Error(`Required package artifact is missing: ${path}`);
	}

	const temp = mkdtempSync(join(tmpdir(), 'nerdamer-package-'));
	try {
		// A fresh working directory ensures the tarball cannot be confused with
		// an older package. Inspect the files npm actually creates instead of
		// relying on the shape of npm's stdout, which varies by npm version.
		const packOutput = npm(['pack', ROOT, '--ignore-scripts'], temp);
		const archives = readdirSync(temp).filter(name => name.endsWith('.tgz'));
		if (archives.length !== 1) {
			throw new Error(
				`Expected one npm tarball in ${temp}, found ${archives.length}. ` +
				`Directory entries: ${readdirSync(temp).join(', ') || '(empty)'}. ` +
				`npm pack output: ${packOutput || '(empty)'}`
			);
		}
		const packed = archives[0];
		const tarball = join(temp, packed);
		if (statSync(tarball).size === 0) {
			throw new Error(`npm pack created an empty tarball at ${tarball}`);
		}

		const consumer = join(temp, 'consumer');
		mkdirSync(consumer);
		writeFileSync(join(consumer, 'package.json'), '{"private":true}');
		npm(['install', tarball, '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], consumer);
		if (existsSync(join(consumer, 'node_modules', 'nerdamer', 'docs'))) {
			throw new Error('Packed package contains internal docs.');
		}
		validateInstalledPackage(consumer);
		validateInstalledTypes(consumer);
		console.log(`Validated ${packed} for npm publication.`);
	} finally {
		rmSync(temp, { recursive: true, force: true });
	}
}

main();