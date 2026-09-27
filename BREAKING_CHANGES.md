# Breaking changes in Nerdamer 2.0

Nerdamer 2.0 is a TypeScript rewrite of Nerdamer. Normal expression-oriented usage remains intentionally familiar, but 2.0 is not a drop-in replacement for code that depends on Nerdamer 1.x internals, stored-expression state, add-on loading, or legacy JavaScript result shapes.

This document lists the compatibility changes that application authors should review when moving from Nerdamer 1.x to 2.0.

## Runtime and package layout

- Node.js 18 or newer is required.
- TypeScript declarations ship with the package.
- The old side-effect add-on loading model (`Algebra`, `Calculus`, `Solve`, and `Extra`) is not used in 2.0.
- The normal `nerdamer` entry point assembles the complete CAS.
- Supported direct package entry points include `nerdamer/core`, `nerdamer/algebra`, `nerdamer/calculus`, `nerdamer/solve`, `nerdamer/structures`, `nerdamer/assumptions`, `nerdamer/parser`, `nerdamer/advanced`, and `nerdamer/debug`.
- Browser builds are split into the complete `dist/bundle.js` target and the smaller `dist/parser.js` target.

The parser entry point is intentionally not the complete CAS. It registers the parser/core, scripting, assumptions, structures, polynomial, complex, and general math domains without importing the higher-level algebra, calculus, and solver domains.

## The main `nerdamer(...)` call

Nerdamer 1.x accepted additional arguments for post-parse behavior and stored-expression history:

```ts
nerdamer(expression, substitutions?, option?, location?)
```

Nerdamer 2.0 uses:

```ts
nerdamer(input, values?)
```

Use methods on the returned entity instead of the old third argument:

```javascript
// 1.x
nerdamer('(x+1)^3', undefined, 'expand');

// 2.0
nerdamer('(x+1)^3').expand();
```

The old location argument is gone because 2.0 does not maintain the 1.x global expression history.

## Stored expression history was removed

The following history-oriented 1.x APIs are not part of 2.0:

- `expressions()`
- `getExpression()`
- `getEquation()`
- `clear()`
- `flush()`
- `numExpressions()`
- `numEquations()`

Store parsed entities in normal JavaScript variables instead.

## Parser return types

Nerdamer 2.0 returns the Nerdamer entity represented by the input rather than wrapping every parser result as an `Expression`.

Scalar symbolic input normally returns `Expression`. Structured input can return `Equation`, `Vector`, `Matrix`, `Collection`, `ValuesSet`, or `Dictionary`. The TypeScript return type of the callable API is therefore `ParserEntity`.

Code that assumes every call returns an `Expression` must narrow the result when it accepts structured notation.

## Root API is explicit

Nerdamer 1.x exposed many registered parser/add-on functions automatically on the root `nerdamer` object. Nerdamer 2.0 has an explicit, tested root API instead.

Many compatibility names have been deliberately restored, including:

- algebra/calculus names such as `expand`, `factor`, `simplify`, `gcd`, `lcm`, `partfrac`, `diff`, `integrate`, `limit`, `laplace`, and `ilt`;
- trigonometric aliases such as `arccos`, `arcsin`, and `arctan`;
- `factorial`, `dfactorial`, `atan2`, `nthroot`, `min`, `max`, and `sinc`;
- `radians`, `degrees`, `log10`, `step`, `rect`, `tri`, `continued_fraction`, `gamma_incomplete`, and `gamma_incomplete_lower`;
- `scientific`, `pfactor`, `pfactord`, `parens`, `invert`, `roots`, `coeffs`, and `line`;
- `sqcomp`, `polyFactors`, `uSub`, `uUnSub`, `conjugate`, `csgn`, `isPrime`, and `nullspace`;
- `isReserved(name)` for the supported live reserved-name check.

Compatibility names are backed by the 2.0 implementations; they are not copies of the 1.x internals.

The statistics functions from the old `Extra` add-on were not recreated merely to preserve their names:

- `mean`
- `median`
- `mode`
- `smpvar`
- `variance`
- `smpstdev`
- `stdev`
- `zscore`

## Lower-level extension and inspection APIs

The following 1.x internal/extension hooks are not restored as public 2.0 APIs:

- `getCore()`
- `register()`
- `replaceFunction()`
- `tree()`
- `htmlTree()`
- `addPeeker()`
- `removePeeker()`
- `rpn()`

Use the supported package entry points and exported TypeScript classes for direct access to the 2.0 implementation. `setFunction()` remains available for user-defined symbolic functions.

`updateAPI()` still exists, but its role is narrower than in 1.x. The complete package uses it to connect a selected set of higher-level operations to parsed entities; it does not expose every registered parser function as a root method.

## Parser access changed

The old root helpers `parse()`, `reserved()`, `supported()`, `validateName()`, and `validVarName()` are not exposed in the same form.

`nerdamer.isReserved(name)` is supported, and parser APIs are available from `nerdamer/parser` instead of through the old `getCore().PARSER` object.

## Solver results

Single-variable solving returns a `SolutionSet`.

System solving returns a `Vector` containing a `Dictionary` for each solution rather than the nested JavaScript arrays used by older code.

The legacy `solveeqs` name remains as the compatibility alias for `solveSystem()`. `solveEquations` is not retained as a public 2.0 name.

Code that consumes solver results by indexing native arrays must be updated for the Nerdamer structures.

## Prime factorization return types

`pfactor(n)` returns a `Vector` containing repeated prime factors in ascending order.

For example:

```text
pfactor(100) -> [2,2,5,5]
```

`pfactord(n)` returns a `Dictionary` mapping each prime to its multiplicity:

```text
pfactord(100) -> {2=>2,5=>2}
```

Code expecting the older prime-factor representation should choose the form it actually needs.

## Expression and chaining behavior

The complete package adds selected operations to parser entities without making the core classes import the higher-level CAS modules. Chainable operations include differentiation, expansion, factorization, integration, numeric evaluation, simplification, and substitution where appropriate.

Operations on structured entities are applied according to the entity's supported semantics; scalar-only operations such as `buildFunction()` reject structured results.

Several familiar `Expression` conveniences are retained, including `latex()`, `isInfinity()`, `isFraction()`, `hasIntegral()`, `equals()`, and `solveFor()`.

`equals()` and `eq()` are not synonyms in 2.0: `equals()` constructs an `Equation`; `eq()` tests equality.

The following older methods were not restored automatically because the closest 2.0 operation is not semantically identical in every case:

- `isPolynomial()`
- `contains()`
- `operation()`

## Text output and formatting

The default symbolic `text()` representation preserves Nerdamer's normal canonical ordering. Presentation-oriented ordering is opt-in per call:

```javascript
nerdamer('x^2+2*x+1').text();
// 1+2*x+x^2

nerdamer('x^2+2*x+1').text({ sort: true });
// x^2+2*x+1
```

`TextOptions` is exported from the root package and `nerdamer/core`. Per-call sorting does not mutate the expression or change the process-wide `SORT_TERMS` setting.

Scientific formatting is also available per call. It preserves mathematical exactness rather than rounding a symbolic exponent into a different value.

## Assumptions

Assumption handling was rewritten around numeric interval assumptions. Assumptions are process-wide and participate in comparisons and sign-sensitive simplifications.

Repeated assumptions for a symbol are intersected. Contradictory assumptions are rejected rather than silently replacing the previous interval.

Use the public APIs from `nerdamer/assumptions` when assumptions need to be inspected, removed, or cleared.

## Scripting and no-result semantics

The scripting implementation has been rewritten. Assignments, local bindings, conditionals, loops, blocks, `return`, `break`, `continue`, and error-handling helpers operate on the 2.0 parser entity model.

A control-flow operation that intentionally produces no mathematical result is represented internally by a null signal. It is not represented by an empty `Vector`, and it is not a legitimate mathematical value that can be assigned accidentally. If an internal no-result signal escapes to a parser boundary where a value is required, it is converted to the corresponding localized error.

Code that depended on undocumented 1.x scripting internals should be revalidated rather than assuming identical control-flow behavior.

## Deferred simplification

The parser has a `DEFER_SIMPLIFICATION` mode intended for workflows that need to preserve an unevaluated parse structure, such as instructional tooling. It is not equivalent to the normal simplifying parser and has documented limitations. Code should not assume that deferred and normal parsing produce interchangeable internal trees.

## Numeric implementation

The numeric implementation has changed substantially. Nerdamer 2.0 uses native `BigInt` for large integers, Decimal.js for decimal arithmetic, exact rational arithmetic where possible, and rewritten complex-number handling.

Code that reached into undocumented 1.x numeric representations should use the public numeric classes and APIs instead.

## Polynomial, factorization, and Groebner internals

Polynomial representation, GCD, factorization, polynomial solving, and Groebner machinery have been substantially rewritten. These changes are implementation details for normal Nerdamer notation, but they are breaking for applications that imported or depended on undocumented 1.x algorithm internals.

Use the supported `nerdamer/algebra`, `nerdamer/solve`, and `nerdamer/advanced` entry points for direct algorithm access.

## Browser builds and localization

The browser build now has explicit complete and parser targets. Build-time language selection supports:

- `eng`
- `spa`
- `fra`
- `deu`
- `por`
- `ita`
- `nld`
- `all`

English is the default. The selected language set affects bundled localized error messages.

## License

Nerdamer 2.0 is licensed under the Apache License 2.0. Nerdamer 1.x releases used the MIT License.

## Migration checklist

For an existing Nerdamer 1.x application:

1. Remove side-effect imports of `Algebra`, `Calculus`, `Solve`, and `Extra`.
2. Remove use of the third and fourth `nerdamer(...)` arguments.
3. Replace stored-expression-history APIs with normal application state.
4. Account for `ParserEntity` return types when input can produce structured values.
5. Update system-solver consumers for `Vector`/`Dictionary` results.
6. Replace direct use of 1.x internals with supported package entry points.
7. Check any old root helper against the documented 2.0 root API rather than assuming every registered parser function is exported.
8. Revalidate code that depends on numeric, polynomial, parser, assumptions, set, or scripting internals.
9. Choose the complete package or parser entry point/build according to the functionality actually required.
10. Run the application's own behavioral tests against 2.0 before upgrading production code.

For a more detailed side-by-side migration guide, see [`docs/MIGRATING_FROM_1X.md`](docs/MIGRATING_FROM_1X.md). Current documentation and examples are available at https://nerdamer.com/.

Source and issue tracking for the release are at https://github.com/jiggzson/nerdamer.
