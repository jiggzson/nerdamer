---
title: Release notes
description: What changed in each Nerdamer 2 release.
---
# Release notes

Upgrading from Nerdamer 1.x? See [Migrating from Nerdamer 1.x](BREAKING_CHANGES.md).

## 2.1.0

### New functions

- `vars(x+y*z)` lists the variables of an expression: `[x, y, z]`.
- `binom(5,2)` is the binomial coefficient: `10`.
- `nextprime(10)` gives the next prime after a number: `11`.
- `powmod(2,10,7)` computes a power modulo a number: `2`.
- `taylor(e^x,x,0,3)` gives a Taylor polynomial: `1+x+(1/2)*x^2+(1/6)*x^3`.
- `rank(matrix([1,2],[2,4]))` gives the rank of a matrix, `1`, and `trace(matrix([1,2],[3,4]))` its trace, `5`.
- Every inverse trigonometric and hyperbolic function also has its `arc` name: `arccos(1/2)` is `acos(1/2)`, and `arcsinh(x)` gives `asinh(x)`. The names are `arcsin`, `arccos`, `arctan`, `arcsec`, `arccsc`, `arccot` and `arcsinh`, `arccosh`, `arctanh`, `arcsech`, `arccsch`, `arccoth`, in Notation and on `nerdamer`.

### 1.x names

- **Older names work again, with a warning.** `IF`, `is_in`, `is_subset` and `solveEquations` give the same results as `if`, `contains`, `issubset` and `solveeqs`. Each call records an `api.deprecatedFunction` warning naming the replacement. See [Deprecated 1.x names](BREAKING_CHANGES.md#deprecated-1x-names).
- **`ilt` in Notation.** `ilt(1/(s^2+1),s,t)` is `ilaplace(1/(s^2+1),s,t)`, as `nerdamer.ilt` already was. It's a permanent name and doesn't warn.

### Solving

- **Exact exponents.** `solve(2^x=8,x)` gives `{3}`; 2.0.1 gave `{log(8)*log(2)^-1}`.
- **Every solution of an exponential.** `solve(e^x=-1,x)` gives the whole family `{i*(pi+2*pi*_n)}`; 2.0.1 gave only `{pi*i}`.
- **Cubics with three real roots.** `solve(x^3-3*x+1,x)` gives `{2*cos((2/9)*pi), 2*cos((4/9)*pi), 2*cos((10/9)*pi)}`; 2.0.1 gave `{}`.
- **A search window.** `solve` takes an optional third argument `[lower, upper]` that limits the numerical search (the default is `[-10, 10]`). Exact roots are returned wherever they are: `solve(x^3-x,x,[0.5,2])` still gives `{0, -1, 1}`. To keep only the real solutions in a range, use `realsolutions(solve(x^2-144,x),-15,0)`, which gives `{-12}`.
- **Comparisons are errors.** `solve(x^2<4,x)` throws "Cannot solve the comparison < in solve! Use = for an equation; inequalities are not supported yet." 2.0.1 returned `{all}`, which was wrong. `solveeqs` and `roots` reject comparisons too.
- **A choice of root finder.** `roots(x^3-2,x,jenkinstraub)` uses the Jenkins-Traub method. Aberth's method is still the default.

### Calculus

- **The variable can be left out** when the input has only one: `integrate(x^2)` gives `(1/3)*x^3` and `solve(x^2-4)` gives `{2, -2}`. With no variable at all, `diff(5)` gives `0`, while `integrate(5)` and `solve(5)` throw. The JavaScript forms do the same, and `nerdamer.diff` and `nerdamer.integrate` also accept vectors and matrices: `nerdamer.diff('[x,x^2]')` gives `[1, 2*x]`.
- **More integrals.** For example, `integrate(x*e^x*sin(x),x)` now has an answer.
- **Divergent definite integrals.** `defint(1/x,x,0,1)` stays unevaluated and records a `defint.singularity` warning, instead of returning a wrong number (2.0.1 gave about `38.04`).
- **Exact or fast numerical integration.** Numerical `defint` computes at the configured precision. The new `USE_NATIVE_DEFINT` setting uses faster JavaScript numbers instead.

### Numbers and errors

- **Large exact powers.** `2^200` gives all 61 digits, up to the `MAX_NUMBER_DIGITS` limit (100,000 digits by default). 2.0.1 left it as `2^200`.
- **Clearer results for undefined values:**
  - `0^(-1)` throws "Division by zero is not defined!"; 2.0.1 gave `0`.
  - `log(0)` gives `-Inf`.
  - `gamma(-1)` throws "gamma is undefined for zero and negative integers!".
  - `(-3)!!` gives `-1`, and `(-2)!!` throws, since the double factorial isn't defined for negative even numbers.
- **Renamed `Complex` methods.** In `nerdamer/advanced`, `Complex` uses `plus()` and `minus()` instead of `add()` and `sub()`, matching `times()` and `div()`.
- **Settings.** New limits on large inputs: `MAX_FACTORIAL_INPUT` (25,000), `MAX_DFACT_INPUT` (45,000), `MAX_FIB_INPUT` (450,000) and `MAX_RADICAL_FACTOR_STEPS` (5,000). The `MAX_FRAC_INT` setting is removed.

### Simplification

- `simplify` cancels logarithm ratios, including inside products, powers and sums: `simplify(x*log(9)/log(3))` gives `2*x`.

### Sets

- **Set functions from 1.x are back.** `union({a,b},{b,c})` gives `{a, b, c}`, `intersection({a,b},{b,c})` gives `{b}` and `difference({a,b},{b,c})` gives `{a}`. `union` and `intersection` take any number of sets. `intersects({a,b},{b,c})` gives `1` because the sets share a value, and `issubset({a},{a,b})` gives `1` because every value of the first set is in the second; both give `0` otherwise. In JavaScript they are `nerdamer.union`, `nerdamer.intersection`, `nerdamer.difference`, `nerdamer.intersects` and `nerdamer.issubset`, and they can also be imported from `nerdamer/structures` (`issubset` as `isSubset`). The 1.x spelling `is_subset` still works but is deprecated. See [Sets and solution sets](https://nerdamer.com/docs/guides/sets/).
- Functions that work on each element of a vector or matrix now also work on a set: `abs({-1,1,2})` gives `{1, 2}` and `factor({x^2-1})` gives `{(1+x)*(-1+x)}`. So do their JavaScript forms, such as `nerdamer.abs`.

### TeX output

- In TeX, the `_n` of a periodic solution is written as `n` instead of a subscript. The new `TEX_PERIODIC_VAR` setting chooses the letter. If the expression already uses that letter, another one is chosen and a `tex.periodicVariable` warning is recorded.

### Warnings

- Three new warning codes: `defint.singularity`, `tex.periodicVariable` and `api.deprecatedFunction`. Read warnings with `nerdamer.getWarnings()`. See [Warnings](https://nerdamer.com/docs/guides/warnings/).

## 2.0.1

- **Listing solutions.** `SolutionSet.generate()` lists members of a family of solutions, by value (`interval`) or by index (`indices`). In Notation, `realsolutions(solve(sin(x),x),-10,10)` does the same. See [Sets and solution sets](https://nerdamer.com/docs/guides/sets/).
- **Real values from a system.** `realsolutions(solveeqs(...), x, lower, upper)` returns the real values of one variable from a system's solutions.
- **Statistics.** The 1.x Extra functions are back: `mean`, `median`, `mode`, `variance`, `smpvar`, `stdev`, `smpstdev` and `zscore`, also from `nerdamer/statistics`.
- **Significant figures.** `significant(value, digits)` rounds to significant figures ([jiggzson/nerdamer#330](https://github.com/jiggzson/nerdamer/issues/330)). `round` still counts decimal places, and `scientific` only changes the display.
- **Seven-dimensional cross products,** using a documented octonion basis ([jiggzson/nerdamer#302](https://github.com/jiggzson/nerdamer/issues/302)). Cross products in zero and one dimensions return zero vectors; three-dimensional results are unchanged, and other dimensions throw `DimensionError`.
- **Logarithms and powers.** All nine examples in [jiggzson/nerdamer#255](https://github.com/jiggzson/nerdamer/issues/255) now simplify as expected under real-domain assumptions, and a polynomial-cancellation error found along the way is fixed.

## 2.0.0

Nerdamer 2 is a rewrite in TypeScript. `nerdamer('...')` works much as in 1.x, and there are now typed imports for every area.

### What's new

- **TypeScript.** Written in TypeScript, with types included.
- **One package.** Algebra, calculus, solving, matrices, vectors and the special functions are all included, with no add-ons to load.
- **Import what you need.** You can import single areas: `nerdamer/core`, `nerdamer/algebra`, `nerdamer/calculus`, `nerdamer/solve`, `nerdamer/structures`, `nerdamer/assumptions`, `nerdamer/statistics`, `nerdamer/special`, `nerdamer/constants`, `nerdamer/parser`, `nerdamer/advanced` and `nerdamer/debug`.
- **A smaller parser package.** `nerdamer/parser` has Notation and Scripting, assumptions, vectors, matrices and sets, polynomial and complex operations, and the general math functions, without algebra, calculus and solving. In the browser it is `dist/parser.js`, which defines `nerdamerParser`. `dist/bundle.js` is the complete package.
- **Results keep their type.** A result is an `Expression`, `Equation`, `Vector`, `Matrix`, `Collection`, `ValuesSet` or `Dictionary`, depending on the input. Solving returns a `SolutionSet`, and system solving a vector of dictionaries.
- **New public classes.** `Polynomial`, sparse polynomials, `PolynomialSolver` and the other solvers, `SolutionSet`, Gröbner bases, assumptions and finite sets can all be used directly.
- **Algebra.** New polynomial GCD and factoring, including multivariate factoring, new partial fractions, faster and more reliable Gröbner bases, and sturdier polynomial root finding.
- **Numbers.** Exact integers and fractions where possible, `BigInt` for large integers, Decimal.js for decimals, and new complex-number arithmetic, including the remainder of Gaussian integers.
- **Scripting.** Functions, assignments, local values, conditions, loops, blocks, `return`, `break`, `continue` and error handling. A loop or condition that produces no value is no longer mistaken for an empty vector.
- **Assumptions** about variables, used by comparisons and simplification. See [Assumptions](https://nerdamer.com/docs/guides/assumptions/).
- **Text output.** `text({ sort: true })` sorts terms for one call, and `text()` also takes `decimal`, `precision`, `scientific` and `wrapPow`.
- **Error messages** in English, Spanish, French, German, Portuguese, Italian and Dutch. The language set is chosen when building the browser bundle.
- **`buildFunction()`** compiles an expression to a fast JavaScript function, and throws for operations it can't compile instead of leaving them in. It builds the function at run time, so a Content Security Policy that forbids that needs `evaluate()` instead.

### Changes from 1.x

- The `Algebra`, `Calculus`, `Solve` and `Extra` add-ons are gone; everything is in the main package.
- `nerdamer(...)` takes two arguments, `nerdamer(input, values?)`.
- There's no global expression history.
- `getCore()`, `register()` and the other low-level hooks are gone.
- Only the listed import paths are supported, not paths into the package's internal files.
- Scripts separate statements with semicolons.
- Node.js 18 or newer is required.
- Many 1.x names are back, such as `roots`, `coeffs`, `line`, `scientific`, `pfactor`, `radians`, `log10`, `step` and `isReserved`.

[Migrating from Nerdamer 1.x](BREAKING_CHANGES.md) has the full list, with examples.

## Links

Documentation: https://nerdamer.com/docs/. Source and issues: https://github.com/jiggzson/nerdamer.
