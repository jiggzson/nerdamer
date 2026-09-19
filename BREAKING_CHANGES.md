# Breaking changes in Nerdamer 2.0

Nerdamer 2.0 is a TypeScript rewrite of Nerdamer. Familiar expression-oriented usage remains, but several public behaviors and extension points differ from Nerdamer 1.x.

## Package and runtime requirements

- Node.js 18 or newer is required.
- The old core-plus-add-on loading model is gone. Algebra, calculus, solving, matrices, vectors, and commonly used special functions are included in the main package.
- TypeScript declarations ship with the package.
- Public package paths are available for `core`, `algebra`, `calculus`, `solve`, `structures`, `assumptions`, `parser`, `advanced`, and `debug`.

## Main `nerdamer(...)` call

Nerdamer 1.x maintained a process-wide history of parsed expressions and accepted additional arguments related to that history. Nerdamer 2.0 does not keep that history.

The normal call is:

```ts
nerdamer(input, values?)
```

The old history helpers are not part of 2.0:

- `expressions()`
- `getExpression()`
- `getEquation()`
- `clear()`
- `flush()`
- `numExpressions()`
- `numEquations()`

Parser-facing APIs consistently return Nerdamer-native values. Ordinary scalar math returns an `Expression`; structured notation returns the corresponding Nerdamer type, such as `Equation`, `Vector`, `Matrix`, `Collection`, `ValuesSet`, or `Dictionary`, instead of mixing Nerdamer values with JavaScript-native result shapes.

## Root API

Nerdamer 1.x exposed many parser functions automatically on the root `nerdamer` object. Nerdamer 2.0 uses an explicit root API.

Several familiar names remain available, and 2.0 adds direct public helpers such as:

- `completeSquare`
- `polyFactors`
- `uSub`
- `uUnSub`
- `conjugate`
- `csgn`
- `isPrime`
- `nullspace`

Some older automatically exposed helpers are not part of the 2.0 root API, including:

- `radians`
- `degrees`
- `log10`
- `step`
- `rect`
- `tri`
- `continued_fraction`
- `gamma_incomplete`
- `scientific`
- `pfactor`
- `vector`
- `Set`
- `parens`
- `invert`
- `roots`
- `coeffs`
- `line`

The old statistics functions from the `Extra` add-on are also not restored as root methods.

## Extension and inspection APIs

The following lower-level 1.x helpers are not restored:

- `getCore()`
- `register()`
- `replaceFunction()`
- `tree()`
- `htmlTree()`
- `addPeeker()`
- `removePeeker()`
- `rpn()`

Use the documented package paths and public TypeScript classes instead. `setFunction()` remains available for symbolic user-defined functions.

## Solver results

Solver results use explicit Nerdamer structures rather than compatibility-only JavaScript arrays.

Single-variable solving returns a `SolutionSet`. System solving returns Nerdamer structures representing the solved values.

Code that assumes a plain JavaScript array should be updated to use the returned Nerdamer type and its public methods.

## Assumptions

Assumption handling has been rebuilt around numeric interval assumptions. Assumptions are process-wide and are used by comparisons and sign-sensitive simplifications.

Use the public assumption API from `nerdamer/assumptions` when assumptions need to be inspected, removed, or cleared.

## Numeric and mathematical behavior

Decimal arithmetic, complex-number handling, parser behavior, solving, assumptions, sets, and several simplification rules were substantially revised for 2.0. Code that relied on undocumented 1.x internal representations should be tested against the 2.0 release rather than assuming identical internals.

## License

Nerdamer 2.0 is licensed under the Apache License 2.0. Nerdamer 1.x releases used the MIT License.

## Migration

For ordinary use, start with the main package and update code only where it depends on one of the differences above. The current documentation and examples are available at:

https://nerdamer.com/
