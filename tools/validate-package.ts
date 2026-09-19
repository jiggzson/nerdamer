import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import nerdamerSource from '../src';
import * as advancedSource from '../src/api/advanced';
import * as algebraSource from '../src/api/algebra';
import * as assumptionsSource from '../src/api/assumptions';
import * as calculusSource from '../src/api/calculus';
import * as coreSource from '../src/api/core';
import * as debugSource from '../src/api/debug';
import * as parserSource from '../src/api/parser';
import * as solveSource from '../src/api/solve';
import * as structuresSource from '../src/api/structures';

interface PackageManifest {
	name: string;
	main?: string;
	types?: string;
	exports?: unknown;
	typesVersions?: Record<string, Record<string, string[]>>;
}

const REPOSITORY_ROOT = resolve(__dirname, '..');
const PACKAGE_JSON_PATH = join(REPOSITORY_ROOT, 'package.json');
const FORBIDDEN_PACKAGE_PATHS = ['src', 'spec', 'tools', 'generated', 'docs'];
const EXPECTED_RUNTIME_EXPORTS = {
	'nerdamer/core': Object.keys(coreSource).sort(),
	'nerdamer/algebra': Object.keys(algebraSource).sort(),
	'nerdamer/calculus': Object.keys(calculusSource).sort(),
	'nerdamer/solve': Object.keys(solveSource).sort(),
	'nerdamer/structures': Object.keys(structuresSource).sort(),
	'nerdamer/assumptions': Object.keys(assumptionsSource).sort(),
	'nerdamer/parser': Object.keys(parserSource).sort(),
	'nerdamer/advanced': Object.keys(advancedSource).sort(),
	'nerdamer/debug': Object.keys(debugSource).sort(),
};
const EXPECTED_ROOT_PROPERTIES = Object.keys(nerdamerSource).sort();
const EXPECTED_ROOT_CLASS_PROPERTIES = Object.keys(nerdamerSource.classes).sort();
const EXPECTED_ROOT_CLASS_INSTANCE_PROPERTIES = Object.keys(nerdamerSource.classes.instance).sort();
const EXPECTED_ROOT_ERROR_PROPERTIES = Object.keys(nerdamerSource.errors).sort();

const COMMONJS_SMOKE_TEST = `
const nerdamer = require('nerdamer');
const core = require('nerdamer/core');
const algebra = require('nerdamer/algebra');
const calculus = require('nerdamer/calculus');
const solve = require('nerdamer/solve');
const structures = require('nerdamer/structures');
const assumptions = require('nerdamer/assumptions');
const parser = require('nerdamer/parser');
const advanced = require('nerdamer/advanced');
const debug = require('nerdamer/debug');
const parserDocs = require('nerdamer/docs-data/parser-functions.json');
const bundle = require('nerdamer/dist/bundle.js');
const parserBundle = require('nerdamer/dist/parser.js');
const packageInfo = require('nerdamer/package.json');

const packagedModules = {
	'nerdamer/core': core,
	'nerdamer/algebra': algebra,
	'nerdamer/calculus': calculus,
	'nerdamer/solve': solve,
	'nerdamer/structures': structures,
	'nerdamer/assumptions': assumptions,
	'nerdamer/parser': parser,
	'nerdamer/advanced': advanced,
	'nerdamer/debug': debug,
};
const expectedRuntimeExports = ${JSON.stringify(EXPECTED_RUNTIME_EXPORTS)};
const expectedRootProperties = ${JSON.stringify(EXPECTED_ROOT_PROPERTIES)};
const expectedRootClassProperties = ${JSON.stringify(EXPECTED_ROOT_CLASS_PROPERTIES)};
const expectedRootClassInstanceProperties = ${JSON.stringify(EXPECTED_ROOT_CLASS_INSTANCE_PROPERTIES)};
const expectedRootErrorProperties = ${JSON.stringify(EXPECTED_ROOT_ERROR_PROPERTIES)};

if (typeof nerdamer !== 'function') {
	throw new Error('The package root is not callable through CommonJS.');
}

if (nerdamer('x+1').text() !== '1+x') {
	throw new Error('The packaged root API did not parse a basic expression correctly.');
}

const actualRootProperties = Object.keys(nerdamer).sort();
if (
	actualRootProperties.length !== expectedRootProperties.length ||
	actualRootProperties.some((name, index) => name !== expectedRootProperties[index])
) {
	throw new Error(
		'The packaged root API differs from the source root API. Expected [' +
			expectedRootProperties.join(', ') +
			'] but received [' +
			actualRootProperties.join(', ') +
			'].'
	);
}

const actualRootClassProperties = Object.keys(nerdamer.classes).sort();
if (
	actualRootClassProperties.length !== expectedRootClassProperties.length ||
	actualRootClassProperties.some((name, index) => name !== expectedRootClassProperties[index])
) {
	throw new Error(
		'The packaged classes registry differs from the source registry. Expected [' +
			expectedRootClassProperties.join(', ') +
			'] but received [' +
			actualRootClassProperties.join(', ') +
			'].'
	);
}

const actualRootClassInstanceProperties = Object.keys(nerdamer.classes.instance).sort();
if (
	actualRootClassInstanceProperties.length !== expectedRootClassInstanceProperties.length ||
	actualRootClassInstanceProperties.some(
		(name, index) => name !== expectedRootClassInstanceProperties[index]
	)
) {
	throw new Error(
		'The packaged classes.instance registry differs from the source registry. Expected [' +
			expectedRootClassInstanceProperties.join(', ') +
			'] but received [' +
			actualRootClassInstanceProperties.join(', ') +
			'].'
	);
}

const actualRootErrorProperties = Object.keys(nerdamer.errors).sort();
if (
	actualRootErrorProperties.length !== expectedRootErrorProperties.length ||
	actualRootErrorProperties.some((name, index) => name !== expectedRootErrorProperties[index])
) {
	throw new Error(
		'The packaged error registry differs from the source registry. Expected [' +
			expectedRootErrorProperties.join(', ') +
			'] but received [' +
			actualRootErrorProperties.join(', ') +
			'].'
	);
}

for (const [specifier, moduleValue] of Object.entries(packagedModules)) {
	const expectedNames = expectedRuntimeExports[specifier];
	const actualNames = Object.keys(moduleValue).sort();
	if (
		actualNames.length !== expectedNames.length ||
		actualNames.some((name, index) => name !== expectedNames[index])
	) {
		throw new Error(
			specifier +
				' differs from its source entry point. Expected [' +
				expectedNames.join(', ') +
				'] but received [' +
				actualNames.join(', ') +
				'].'
		);
	}
}

if (parser.Parser.parse('x+1').text() !== '1+x') {
	throw new Error('The packaged parser subpath did not parse correctly.');
}

if (!parserBundle.Parser || parserBundle.Parser.parse('x+1').text() !== '1+x') {
	throw new Error('The standalone parser bundle did not parse correctly.');
}

if (debug.inspectParse('x+1').result.text !== '1+x') {
	throw new Error('The packaged debug subpath did not inspect a parse correctly.');
}

if (!Array.isArray(parserDocs.functions) || parserDocs.functions.length === 0) {
	throw new Error('The packaged parser documentation artifact is empty or invalid.');
}

if (typeof bundle !== 'function') {
	throw new Error('The explicitly exported browser bundle is not callable in CommonJS.');
}

if (packageInfo.name !== 'nerdamer') {
	throw new Error('The exported package.json does not describe nerdamer.');
}
`;

const ESM_SMOKE_TEST = `
import nerdamer from 'nerdamer';
import { Expression, buildFunction } from 'nerdamer/core';
import { Polynomial, factor } from 'nerdamer/algebra';
import { diff } from 'nerdamer/calculus';
import { SolutionSet, solveSystem } from 'nerdamer/solve';
import { Collection, Dictionary, Matrix } from 'nerdamer/structures';
import { assume } from 'nerdamer/assumptions';
import { Parser } from 'nerdamer/parser';
import { Complex } from 'nerdamer/advanced';
import { inspectParse } from 'nerdamer/debug';

const requiredValues = [
	Expression,
	buildFunction,
	Polynomial,
	factor,
	diff,
	SolutionSet,
	solveSystem,
	Collection,
	Dictionary,
	Matrix,
	assume,
	Parser,
	Complex,
	inspectParse,
];

if (typeof nerdamer !== 'function') {
	throw new Error('The package root is not callable through ESM import.');
}

if (requiredValues.some(value => value === undefined)) {
	throw new Error('One or more package subpath exports are missing through ESM import.');
}

if (nerdamer('x+1').text() !== '1+x') {
	throw new Error('The packaged ESM root API did not parse a basic expression correctly.');
}
`;

const TYPESCRIPT_SMOKE_TEST = `
import nerdamer from 'nerdamer';
import { Expression, Rational, buildFunction } from 'nerdamer/core';
import type { ParserEntity } from 'nerdamer/core';
import { Polynomial, Term, factor } from 'nerdamer/algebra';
import { diff, integrate, limit } from 'nerdamer/calculus';
import { SolutionSet, solve, solveSystem } from 'nerdamer/solve';
import { Collection, Dictionary, Matrix, ValuesSet, Vector } from 'nerdamer/structures';
import { Assumption, assume, clearAssumptions } from 'nerdamer/assumptions';
import { Parser } from 'nerdamer/parser';
import { Complex, FunctionSolver, MultiPoly } from 'nerdamer/advanced';
import { inspectParse } from 'nerdamer/debug';

const exportedValues = [
	nerdamer,
	Expression,
	Rational,
	buildFunction,
	Polynomial,
	Term,
	factor,
	diff,
	integrate,
	limit,
	SolutionSet,
	solve,
	solveSystem,
	Collection,
	Dictionary,
	Matrix,
	ValuesSet,
	Vector,
	Assumption,
	assume,
	clearAssumptions,
	Parser,
	Complex,
	FunctionSolver,
	MultiPoly,
	inspectParse,
];

const roots: SolutionSet = solve('x^2-1', 'x');
const rootFromCompatibilityApi: SolutionSet = nerdamer.solve('x^2-1', 'x');
const firstRoot: Expression | undefined = roots.at(0);
const rootArray: Expression[] = roots.toArray();
const iteratedRoots: Expression[] = [...roots];
roots.each(root => {
	root.text();
});
roots.forEach(root => {
	root.text();
});

const systems: Vector = solveSystem(['x+y=3', 'x-y=1'], ['x', 'y']);
const firstSystem = systems.at(0);
if (Dictionary.isDictionary(firstSystem)) {
	firstSystem.get('x')?.text();
}

const collection = new Collection([Expression.create('x'), Expression.create('y')]);
const collectionValue: ParserEntity | undefined = collection.at(0);
const collectionArray: ParserEntity[] = collection.toArray();
const collectionIteration: ParserEntity[] = [...collection];
collection.each(value => {
	value.text();
});
collection.forEach(value => {
	value.text();
});

const dictionary = new Dictionary().set('x', Expression.create(1));
const dictionaryEntries: Array<[string, ParserEntity]> = [...dictionary];
dictionary.each((value, key) => {
	value.text();
	String(key);
});
dictionary.forEach((value, key) => {
	value.text();
	key.toUpperCase();
});

void exportedValues;
void rootFromCompatibilityApi;
void firstRoot;
void rootArray;
void iteratedRoots;
void collectionValue;
void collectionArray;
void collectionIteration;
void dictionaryEntries;
`;

function normalizePackagePath(path: string): string {
	let retval = path;
	if (retval.startsWith('./')) {
		retval = retval.slice(2);
	}
	return retval;
}

function collectPackageTargets(value: unknown, targets: Set<string>): void {
	if (typeof value === 'string') {
		targets.add(normalizePackagePath(value));
	} else if (Array.isArray(value)) {
		for (const entry of value) {
			collectPackageTargets(entry, targets);
		}
	} else if (value && typeof value === 'object') {
		for (const entry of Object.values(value)) {
			collectPackageTargets(entry, targets);
		}
	}
}

function getNpmCliPath(): string {
	const retval = process.env.npm_execpath;
	if (!retval) {
		throw new Error('Run package validation through npm so npm_execpath is available.');
	}
	return retval;
}

function loadPackageManifest(): PackageManifest {
	const retval = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as PackageManifest;
	return retval;
}

function installPackage(packagePath: string, consumerDirectory: string): void {
	execFileSync(
		process.execPath,
		[
			getNpmCliPath(),
			'install',
			packagePath,
			'--install-links',
			'--ignore-scripts',
			'--no-audit',
			'--no-fund',
			'--package-lock=false',
			'--no-save',
		],
		{
			cwd: consumerDirectory,
			stdio: 'inherit',
		}
	);
}
function validateInstalledPackage(manifest: PackageManifest, consumerDirectory: string): void {
	const packageDirectory = join(consumerDirectory, 'node_modules', ...manifest.name.split('/'));
	const requiredTargets = new Set<string>();

	if (manifest.main) {
		requiredTargets.add(normalizePackagePath(manifest.main));
	}
	if (manifest.types) {
		requiredTargets.add(normalizePackagePath(manifest.types));
	}
	collectPackageTargets(manifest.exports, requiredTargets);
	collectPackageTargets(manifest.typesVersions, requiredTargets);

	const missingTargets = [...requiredTargets].filter(
		target => !existsSync(join(packageDirectory, target))
	);
	if (missingTargets.length > 0) {
		throw new Error(`Package export targets missing after install: ${missingTargets.join(', ')}`);
	}

	const leakedPaths = FORBIDDEN_PACKAGE_PATHS.filter(path =>
		existsSync(join(packageDirectory, path))
	);
	if (leakedPaths.length > 0) {
		throw new Error(`Development paths leaked into installed package: ${leakedPaths.join(', ')}`);
	}
}

function runRuntimeSmokeTests(consumerDirectory: string): void {
	const commonJsPath = join(consumerDirectory, 'consumer.cjs');
	const esmPath = join(consumerDirectory, 'consumer.mjs');
	writeFileSync(commonJsPath, COMMONJS_SMOKE_TEST, 'utf8');
	writeFileSync(esmPath, ESM_SMOKE_TEST, 'utf8');

	execFileSync(process.execPath, [commonJsPath], {
		cwd: consumerDirectory,
		stdio: 'inherit',
	});
	execFileSync(process.execPath, [esmPath], {
		cwd: consumerDirectory,
		stdio: 'inherit',
	});
}

function runTypeScriptSmokeTest(consumerDirectory: string): void {
	const sourcePath = join(consumerDirectory, 'consumer.ts');
	const configPath = join(consumerDirectory, 'tsconfig.json');
	const typescriptCli = require.resolve('typescript/lib/tsc');

	writeFileSync(sourcePath, TYPESCRIPT_SMOKE_TEST, 'utf8');
	writeFileSync(
		configPath,
		JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					module: 'Node16',
					moduleResolution: 'Node16',
					strict: true,
					noEmit: true,
					skipLibCheck: false,
					types: [],
				},
				include: ['consumer.ts'],
			},
			null,
			2
		),
		'utf8'
	);

	execFileSync(process.execPath, [typescriptCli, '--project', configPath], {
		cwd: consumerDirectory,
		stdio: 'inherit',
	});
}

function validatePackage(): void {
	const manifest = loadPackageManifest();
	const tempRoot = mkdtempSync(join(tmpdir(), 'nerdamer-package-validation-'));
	const consumerDirectory = join(tempRoot, 'consumer');

	try {
		mkdirSync(consumerDirectory, { recursive: true });

		const requiredGeneratedFiles = [
			join(REPOSITORY_ROOT, 'dist', 'bundle.js'),
			join(REPOSITORY_ROOT, 'dist', 'parser.js'),
			join(REPOSITORY_ROOT, 'output', 'index.d.ts'),
			join(REPOSITORY_ROOT, 'docs-data', 'parser-functions.json'),
		];
		const missingGeneratedFiles = requiredGeneratedFiles.filter(path => !existsSync(path));
		if (missingGeneratedFiles.length > 0) {
			throw new Error(
				'Package validation requires current full and parser builds plus parser documentation. ' +
				'Run npm run build, npm run build:parser, and npm run docs:parser first.'
			);
		}

		writeFileSync(
			join(consumerDirectory, 'package.json'),
			JSON.stringify({ private: true, type: 'module' }, null, 2),
			'utf8'
		);

		installPackage(REPOSITORY_ROOT, consumerDirectory);
		validateInstalledPackage(manifest, consumerDirectory);
		runRuntimeSmokeTests(consumerDirectory);
		runTypeScriptSmokeTest(consumerDirectory);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}

	console.log(`Package validation passed for ${manifest.name}.`);
}

validatePackage();
