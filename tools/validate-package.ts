import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
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
	if (manifest.version !== '2.0.0-rc.2') throw new Error('RC2 package version is not set.');
	if (repository !== EXPECTED_REPOSITORY) throw new Error('Unexpected repository URL.');
	if (bugs !== EXPECTED_BUGS) throw new Error('Unexpected bugs URL.');
	if (manifest.homepage !== EXPECTED_HOMEPAGE) throw new Error('Unexpected homepage URL.');
	if (manifest.main !== 'dist/bundle.js') throw new Error('Unexpected package main entry.');
	if (manifest.types !== 'index.d.ts') throw new Error('Unexpected package type entry.');
}

function validateInstalledPackage(consumer: string): void {
	const smoke = `
const nerdamer = require('nerdamer');
const parser = require('nerdamer/parser');
const algebra = require('nerdamer/algebra');
const calculus = require('nerdamer/calculus');
const solve = require('nerdamer/solve');
const structures = require('nerdamer/structures');
if (typeof nerdamer !== 'function') throw new Error('Package root is not callable.');
if (nerdamer('x+x').text() !== '2*x') throw new Error('Package root smoke test failed.');
if (!parser.Parser || !algebra.factor || !calculus.diff || !solve.solve || !structures.Vector) {
  throw new Error('One or more public subpath exports are unavailable.');
}
`;
	const smokePath = join(consumer, 'smoke.cjs');
	writeFileSync(smokePath, smoke);
	execFileSync(process.execPath, [smokePath], { cwd: consumer, stdio: 'inherit' });
}

function main(): void {
	validateManifest();

	for (const path of ['dist/bundle.js', 'dist/parser.js', 'output/api/core.js', 'index.d.ts', 'docs-data/parser-functions.json']) {
		if (!existsSync(join(ROOT, path))) throw new Error(`Required package artifact is missing: ${path}`);
	}

	const temp = mkdtempSync(join(tmpdir(), 'nerdamer-rc2-'));
	try {
		const packed = npm(['pack', '--pack-destination', temp], ROOT)
			.split(/\r?\n/)
			.filter(Boolean)
			.at(-1);
		if (!packed) throw new Error('npm pack did not return a tarball name.');

		const consumer = join(temp, 'consumer');
		mkdirSync(consumer);
		writeFileSync(join(consumer, 'package.json'), '{"private":true}');
		npm(['install', join(temp, packed), '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], consumer);
		validateInstalledPackage(consumer);
		console.log(`Validated ${packed} for npm publication.`);
	} finally {
		rmSync(temp, { recursive: true, force: true });
	}
}

main();
