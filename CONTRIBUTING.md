# Contributing to Nerdamer

Thank you for your interest in contributing to Nerdamer.

Nerdamer 2.0 is a TypeScript codebase. Before starting work, check the open issues and pull requests to make sure the same problem is not already being addressed.

## Pull requests

Open pull requests against the active development branch shown by the repository unless a maintainer or issue specifies a different target. Do not target a legacy 1.x branch for Nerdamer 2.0 changes.

Keep changes limited to the issue being addressed. Preserve existing behavior unless the change is meant to alter it, and add or update tests for user-visible fixes and regressions.

## Development setup

Nerdamer requires Node.js 18 or newer.

Install dependencies from the repository root:

```bash
npm ci
```

Do not install a separate global test runner. The repository provides its development tools through `devDependencies`.

## Validation

For ordinary source changes, run:

```bash
npm run typecheck
npm run lint
npm test
```

For changes that affect builds, exports, package metadata, parser documentation, or release packaging, also run:

```bash
npm run build
npm run build:parser
npm run docs:parser
npm run validate:package
```

The release validation installs the package into a temporary consumer project and checks the CommonJS, ESM, TypeScript, package-subpath, browser-bundle, parser-bundle, and generated parser-documentation entry points.

## Code style

Follow the existing TypeScript style and the repository ESLint and Prettier configuration. Reuse existing classes, functions, constants, and implementations where possible instead of introducing duplicate helpers.

Keep public behavior and types explicit. If a change affects a public API, update the relevant tests and documentation with the implementation.

## Reporting issues

Please report reproducible problems through the Nerdamer GitHub issue tracker:

https://github.com/jiggzson/nerdamer/issues

Include enough information to reproduce the problem, including:

- the Nerdamer version;
- the Node.js or browser version when relevant;
- a minimal input or code example;
- the result you received;
- the result you expected.

Some long-running umbrella issues use titles such as "Pending issues with solve", "Pending issues with simplify", or similar. If an existing umbrella issue is relevant, reference it from the new issue rather than adding an unrelated report to an old thread.

If you have already traced the problem to a particular part of the codebase, include those findings. They can shorten the review and debugging process.
