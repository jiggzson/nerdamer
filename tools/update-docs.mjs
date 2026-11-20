import { spawnSync } from 'node:child_process';

function runNpm(args) {
	const npmCli = process.env.npm_execpath;
	if (!npmCli) throw new Error('Run the documentation update through npm.');

	const result = spawnSync(process.execPath, [npmCli, ...args], {
		stdio: 'inherit',
	});

	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}

runNpm(['run', 'docs:parser']);
runNpm(['exec', '--', 'typedoc', '--options', 'typedoc.json', '--json', 'docs-data/typedoc.json']);
