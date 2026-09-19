const path = require('node:path');

function fail(message) {
	throw new Error(`Build smoke test failed: ${message}`);
}

function smokeFull() {
	const bundlePath = path.resolve(__dirname, '../dist/bundle.js');
	const nerdamer = require(bundlePath);

	if (typeof nerdamer !== 'function') {
		fail('dist/bundle.js did not export the Nerdamer function.');
	}
	if (nerdamer('x+1').text() !== '1+x') {
		fail('the full bundle could not parse a basic expression.');
	}
	if (typeof nerdamer.diff !== 'function' || nerdamer.diff('x^2', 'x').text() !== '2*x') {
		fail('the full bundle did not expose a working calculus API.');
	}
}

function smokeParser() {
	const bundlePath = path.resolve(__dirname, '../dist/parser.js');
	const parserBundle = require(bundlePath);
	const Parser = parserBundle.Parser;

	if (!Parser || typeof Parser.parse !== 'function') {
		fail('dist/parser.js did not export Parser.');
	}
	if (Parser.parse('x+1').text() !== '1+x') {
		fail('the parser bundle could not parse a basic expression.');
	}
}

const target = process.argv[2];

if (target === 'full') {
	smokeFull();
} else if (target === 'parser') {
	smokeParser();
} else {
	fail(`unknown target '${target ?? ''}'. Expected 'full' or 'parser'.`);
}

console.log(`Build smoke test passed for ${target}.`);
