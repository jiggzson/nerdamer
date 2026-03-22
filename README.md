# Nerdamer 2.xx (TypeScript)

This repository contains the TypeScript rewrite of Nerdamer.

The goal of Nerdamer 2 is not just a direct port of the earlier codebase, but a broader cleanup of the library's internals. Large portions of the original implementation were rewritten to improve typing, parser behavior, symbolic manipulation, numeric precision, and long-term maintainability.

## Project status

The project is still in active development. Much of the library has already been moved to TypeScript, but some areas are still being refined and some compatibility gaps with earlier versions remain.

If your project depends heavily on the older API, you may be better off staying with [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime) for now.

## Common commands

### Type-check / transpile

```bash
npx tsc
```

### Run tests

Be sure to transpile first if your current workflow requires generated output before running the tests.

```bash
npm run test
```

### Build the bundle

This project uses `webpack-cli` for bundling.

```bash
npm run build
```

## Development notes

The `dev.ts` file can be used as a scratch file for experiments, debugging, and on-the-fly testing while working on the library.

## Highlights in v2

Although still a work in progress, version 2 already includes a number of improvements.

- **Improved parsing.** Moving the parser to TypeScript made it easier to reason about and extend.
- **Expanded core structures.** In addition to `Vector`, the library now includes types such as `ValuesSet`, `Dictionary`, and `SolutionsSet` to support more uniform internal and external data handling.
- **Early multi-language support.** Error messages are now routed through a centralized system intended to make additional language support easier.
- **Improved factoring.** Factoring is still being refined, but the current implementation is substantially better than before.
- **Improved simplification.** Some of this progress comes directly from the factoring work.
- **Stronger complex-number support.** Complex values are treated more as first-class objects throughout the library.
- **Built-in arbitrary precision.** The library uses Decimal.js for decimal arithmetic and native `BigInt` for large integers.
- **Solver redesign.** The solver now has a more uniform return model and better symbolic support for functions. The system solver returns `Vector<Dictionary>[]` and uses Gröbner bases for polynomial systems, falling back to Jacobian/Newton-style methods for non-polynomial systems.
- **New `Expression` class.** The old `Symbol` abstraction has been replaced by `Expression`, which simplifies several parts of the library's design and usage.
- **Standalone converters.** Extending `text` and `TeX` conversion is now easier.
- **Improvements to calculus routines.** `diff`, `integrate`, and related functionality have seen substantial work. One of the main integration problems was selecting appropriate stopping conditions in a heavily recursive process. The newer approach reduces that recursion by incorporating lookup-table-based logic. A large part of that work depends on the `Pattern` class, which rewrites expressions into canonical forms.
- **Numerous other fixes and improvements.**

## Compatibility notes

Version 2 introduces breaking changes.

This is partly due to the TypeScript rewrite itself, and partly due to deeper internal refactoring. In some areas the new behavior is intentionally different from earlier releases.

As with any substantial port or redesign, there are still rough edges to work out and some older functionality may need to be restored or adjusted. Even so, the new version is already more consistent internally and provides a stronger foundation for future work.

See the [docs](https://github.com/jiggzson/nerdamer/tree/2.0/docs) for the API as it currently stands.
