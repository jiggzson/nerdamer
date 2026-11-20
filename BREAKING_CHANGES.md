---
title: Migrating from Nerdamer 1.x
description: What changed between Nerdamer 1.x and 2, and how to update an app that uses 1.x.
route: /docs/migration/
---
# Migrating from Nerdamer 1.x

Nerdamer 2 is a rewrite in TypeScript. Everyday code that parses expressions and reads `.text()` mostly works as before, but loading, return types, stored state, solving results, scripting and the low-level extension hooks changed. Plan for more than a version bump.

This guide compares Nerdamer 1.1.13 with Nerdamer 2. If you can't migrate yet, [Nerdamer-Prime](https://github.com/together-science/nerdamer-prime), a fork of 1.x, is still maintained.

Version 2 aims to keep everything 1.x could do. Because it is a rewrite, some rarely used features, aliases or edge cases may be missing. If you find one, please [open an issue](https://github.com/jiggzson/nerdamer/issues) with a small example of the 1.x behavior.

## In short

If your app mostly calls `nerdamer('...')`, reads `.text()` or `.toTeX()`, and uses the common algebra and calculus functions, the move is small. Look more closely if you use:

- the `Algebra`, `Calculus`, `Solve` or `Extra` add-ons;
- the third or fourth argument of `nerdamer(...)`;
- the stored expression history (`expressions()`, `clear()` and the rest);
- the shape of solver results;
- `getCore()`, `register()` or other low-level hooks.

## What stays the same

```js
const nerdamer = require('nerdamer');

nerdamer('x+x').text();               // '2*x'
nerdamer('x^2+y', { x: 3 }).text();   // '9+y'
```

The common expression methods are still there: `text()`, `toString()`, `toTeX()`, `evaluate()`, `buildFunction()`, `variables()`, `sub()`, `solveFor()`, `each()`, `numerator()`, `denominator()`, `hasFunction()`, `isNumber()`, `isImaginary()`, `toDecimal()`, the comparisons, and the arithmetic methods, including the short names `plus()`, `minus()`, `times()`, `div()` and `subst()`.

## Requirements

- Node.js 18 or newer.
- An environment with `BigInt`: Nerdamer 2 uses it for large integers, so some older browsers and runtimes can't run it.
- TypeScript types ship with the package.

## Loading Nerdamer

Nerdamer 1.x was a core plus add-ons:

```js
var nerdamer = require('nerdamer');
require('nerdamer/Algebra');
require('nerdamer/Calculus');
require('nerdamer/Solve');
require('nerdamer/Extra');
```

or one `all.min.js`. In Nerdamer 2, one import gives you everything:

```js
const nerdamer = require('nerdamer');

nerdamer.factor('x^2-1').text();
nerdamer.diff('x^3', 'x').text();
nerdamer.solve('x^2-4', 'x').text();
```

Don't recreate the 1.x loading order, and don't import `nerdamer/all.min`: it isn't a Nerdamer 2 path.

### Importing parts of Nerdamer

You can also import functions, classes and types from these paths:

| Path | Contents |
| --- | --- |
| `nerdamer/core` | Expressions, equations, numbers, conversion, errors |
| `nerdamer/algebra` | Polynomials, factoring, simplification, partial fractions |
| `nerdamer/calculus` | Derivatives, integrals, limits, sums, products, Laplace transforms |
| `nerdamer/solve` | Solving equations and systems |
| `nerdamer/structures` | Matrices, vectors, sets, collections, dictionaries |
| `nerdamer/assumptions` | Assumptions about variables |
| `nerdamer/statistics` | Mean, median, mode, variance, standard deviation, z-scores |
| `nerdamer/special` | Gamma, error and integral functions, and other special functions |
| `nerdamer/constants` | Named groups of functions, such as `TRIG` |
| `nerdamer/parser` | The smaller parser-only package (below) |
| `nerdamer/advanced` | Complex values, Gröbner bases and other advanced tools |
| `nerdamer/debug` | Debugging aids |

```ts
import nerdamer from 'nerdamer';
import { Expression, Rational } from 'nerdamer/core';
import { Polynomial, gcd, lcm, partfrac } from 'nerdamer/algebra';
import { diff, integrate, limit } from 'nerdamer/calculus';
import { solve, PolynomialSolver } from 'nerdamer/solve';
import { Matrix, Vector, ValuesSet } from 'nerdamer/structures';
import { Parser } from 'nerdamer/parser';
import { mean, variance } from 'nerdamer/statistics';
```

These imports are optional; `nerdamer('...')` works as before.

### The smaller parser package

`nerdamer/parser` has Notation and Scripting, assumptions, vectors, matrices and sets, polynomial and complex operations, and the general math functions, but not the algebra, calculus and solving functions.

```ts
import { Parser } from 'nerdamer/parser';

const value = Parser.parse('sqrt(x^2+1)');
console.log(value.text());
```

The browser builds follow the same split: `dist/bundle.js` is the complete package, and `dist/parser.js` the parser package, which defines `nerdamerParser` instead of `nerdamer`.

## The main call has two arguments

Nerdamer 1.x accepted up to four:

```ts
nerdamer(expression, substitutions?, option?, location?)
```

The third argument requested behavior such as `numer` or `expand`; the fourth was a position in the stored expression list. Nerdamer 2 takes two:

```ts
nerdamer(input, values?)
```

Call a method on the result instead of passing the third argument:

```js
// 1.x
nerdamer('cos(x)', { x: 6 }, 'numer');
nerdamer('(x+1)^3', undefined, 'expand');

// 2
nerdamer('cos(x)').evaluate({ x: 6 });
nerdamer('(x+1)^3').expand();
```

## The expression history is gone

Nerdamer 1.x kept every parsed expression in a global list. Nerdamer 2 doesn't, so these are gone: `expressions()`, `getExpression()`, `getEquation()`, `clear()`, `flush()`, `numExpressions()` and `numEquations()`. Keep results in your own variables instead.

## Results keep their type

Nerdamer 1.x wrapped almost every result in its `Expression` object. Nerdamer 2 returns the type of the input:

| Input | Result |
| --- | --- |
| `x^2+1` | `Expression` |
| `x^2=4` | `Equation` |
| `[x,y,z]` | `Vector` |
| `matrix(...)` | `Matrix` |
| `{a,b}` | `ValuesSet` (a set) |
| `{a=>1}` | `Dictionary` |

In TypeScript the return type of `nerdamer(...)` is `ParserEntity`, the union of these. For ordinary expressions nothing changes. If your code can receive an equation, vector or other type, check the type before calling a method that only some types have, such as `buildFunction()`.

## Variables, constants, settings and your own functions

These work as before:

```js
nerdamer.setVar('a', 5);
nerdamer.getVars();
nerdamer.clearVars();

nerdamer.setConstant('g', 9.81);
nerdamer.getConstant('g');
nerdamer.setConstant('g', 'delete');

nerdamer.setFunction('f', ['x'], 'x^2+1');
```

So do `set()` and `get()`. A value passed to `nerdamer(...)` takes priority over an assigned variable. The single-value `getVar()` is gone; use `getVars()`.

## Functions on `nerdamer`

Nerdamer 1.x copied every function it knew onto the `nerdamer` object. Nerdamer 2 lists them explicitly, so nothing internal appears by accident and TypeScript knows exactly what's there. Familiar 1.x names were kept wherever version 2 has the same operation. They use the version 2 code; they aren't copies of 1.x.

| Area | Names on `nerdamer` |
| --- | --- |
| Algebra | `expand`, `factor`, `simplify`, `gcd`, `lcm`, `divide`, `div`, `partfrac`, `deg`, `completeSquare` (Notation: `sqcomp`), `polyFactors`, `uSub`, `uUnSub`, `pfactor`, `pfactord`, `roots`, `coeffs`, `line` |
| Calculus | `diff`, `integrate`, `sum`, `product`, `defint`, `limit`, `laplace`, `ilaplace` and its 1.x name `ilt` (in Notation too), the Fresnel integrals `S` and `C` |
| Trigonometry | `arccos`, `arcsin`, `arctan` (the same as `acos`, `asin`, `atan`), `atan2`. Every inverse trigonometric and hyperbolic function also has its `arc` name, such as `arcsec` and `arcsinh`, in Notation too. These are permanent and don't warn. |
| Other functions | `factorial` and `dfactorial` (also `fact`, `dfact`), `nthroot`, `min`, `max`, `sinc`, `radians`, `degrees`, `log10`, `step`, `rect`, `tri`, `continued_fraction`, `gamma_incomplete`, `gamma_incomplete_lower`, `scientific`, `parens`, `subst` |
| Complex numbers | `conjugate`, `csgn` |
| Number theory | `isPrime` |
| Matrices | `invert`, `nullspace` |
| Sets | `union`, `intersection`, `difference`, `intersects`, `issubset` (`is_subset` also works, but is deprecated and records a warning) |
| Statistics (the 1.x Extra add-on) | `mean`, `median`, `mode`, `variance`, `smpvar`, `stdev`, `smpstdev`, `zscore` |
| Names | `isReserved(name)` |

Notes on some of these:

- **`pfactor` and `pfactord`.** `pfactor(100)` gives `[2, 2, 5, 5]`, the repeated prime factors. `pfactord(100)` gives `{2 => 2, 5 => 2}`, each prime with its count. Choose the form you need.
- **`roots`.** It returns a vector, as in 1.x. For a number it returns its two square roots. For new code, `solve` returns a solution set and handles more than polynomials.
- **`scientific(value[, digits])`.** It sets how a number is displayed, with 1 to 1e9 significant digits and trailing zeros kept, without changing its value.
- **`gamma_incomplete`** is the upper incomplete gamma function and **`gamma_incomplete_lower`** the lower one. For a positive integer first argument they are written out exactly.
- **Statistics.** Population variance divides by `n` and sample variance (`smpvar`) by `n-1`, as in 1.x; the standard deviations are their square roots.
- **`vector(...)` and `Set(...)`** are not back. Write `[...]` for a vector and `{...}` for a set.

### Deprecated 1.x names

Some 1.x names were replaced in version 2. They still work, and give exactly what the new name gives, but each call records an `api.deprecatedFunction` [warning](https://nerdamer.com/docs/guides/warnings/) that names the replacement. They will be removed in a later major version.

| 1.x name | Use instead |
| --- | --- |
| `IF(condition, a, b)` | `if(condition, a, b)` |
| `is_in(values, x)` | `contains(values, x)` |
| `is_subset(A, B)` | `issubset(A, B)` |
| `solveEquations` (Notation and `nerdamer.solveEquations`) | `solveeqs` |

`is_in` takes a vector or a set, as `contains` does; unlike 1.x, it doesn't search a matrix. `solveEquations` returns what `solveeqs` returns: a vector of dictionaries, such as `[{x => 2, y => 1}]`, not the 1.x array of pairs.

## Solving returns Nerdamer results

Solving one equation returns a `SolutionSet`:

```js
nerdamer.solve('x^2-4', 'x').text();   // {2, -2}
```

Solving a system uses `solveSystem()` and returns a vector with one dictionary per solution, instead of nested JavaScript arrays:

```js
nerdamer.solveSystem(['x+y=3', 'x-y=1'], ['x', 'y']).text();
// [{x => 2, y => 1}]
```

In Notation, and on `nerdamer` for compatibility, it is also called `solveeqs`. The 1.x name `solveEquations` still works, but it's deprecated: it returns the same vector and records a warning (see [Deprecated 1.x names](#deprecated-1x-names)). If your code indexed the old arrays, update it for the vector and dictionaries.

## Chaining methods

The complete package adds these operations as methods on every result: `diff()`, `expand()`, `factor()`, `integrate()`, `numeric()`, `simplify()` and `subst()`. A type that already has its own version of a method keeps it.

On a vector, matrix, set or dictionary, the method applies to each element and returns the same kind of value. On an equation it applies to both sides:

```js
nerdamer('x^2').diff('x');                                       // 2*x
nerdamer('[x^2, sin(x)]').diff('x');                             // [2*x, cos(x)]
nerdamer('matrix([cos(x)^2+sin(x)^2], [(1+x)/x])').simplify();
nerdamer('x^2=y').diff('x');                                     // 2*x=0
```

Differentiating or integrating both sides of an equation gives a new equation, but not necessarily one with the same solutions.

These methods exist only when you load the complete package; importing a class from `nerdamer/core` doesn't add them. `buildFunction()` works on a single expression only.

`updateAPI()` still exists but does less than in 1.x: it attaches the methods above. It doesn't copy every function onto `nerdamer`.

## Expression methods kept from 1.x

The complete package keeps these 1.x conveniences:

- `latex()`: TeX output;
- `isInfinity()`: the same as `isInf()`;
- `isFraction()`: whether the number in front is a fraction;
- `hasIntegral()`: whether the expression contains `integrate(...)`;
- `equals()`: makes an `Equation` from the expression and another value;
- `solveFor()`: on both `Expression` and `Equation`.

`equals()` and `eq()` are different: `equals()` makes an equation; `eq()` checks whether two expressions are equal.

Three methods are not back:

- `isPolynomial()`: `isPolynomialLike()` is close, but differs in some edge cases;
- `contains()`: `hasVariable()` differs when the variable is in an exponent;
- `operation()`: an internal helper with no public equivalent.

## Text output

`text()` writes terms in Nerdamer's usual order, so `x^2+2*x+1` prints as `1+2*x+x^2`. For conventional order, pass `{ sort: true }`:

```ts
const expression = nerdamer('x^2+2*x+1');

expression.text();               // '1+2*x+x^2'
expression.text({ sort: true }); // 'x^2+2*x+1'
expression.toText();             // 'x^2+2*x+1'
```

The options for `text()` are `sort`, `decimal`, `precision`, `scientific` and `wrapPow`; their type, `TextOptions`, is exported from `nerdamer` and `nerdamer/core`. They affect only that call, not the `SORT_TERMS` setting. `toText()` always uses conventional order.

`convertToTeX()` is the name for TeX output; `convertToLaTeX()` still works but is deprecated.

## Extension hooks are gone

Nerdamer 1.x let code reach into its internals with `getCore()`, `register()`, `replaceFunction()`, `addPeeker()`, `removePeeker()`, `load()`, `tree()`, `htmlTree()` and `rpn()`. None of these are back. Use the import paths above and the exported classes instead. `setFunction()` still defines your own functions.

Projects that used `getCore()` or `register()` to reach deep into 1.x need the most work.

## Parser access

`parse()`, `reserved()`, `supported()`, `validateName()` and `validVarName()` aren't on `nerdamer` in the same form. `nerdamer.isReserved(name)` is back, and `nerdamer/parser` has the same check as `Parser.isReserved(name)`, along with the other parser functions that used to be on `getCore().PARSER`. See [Reserved names](https://nerdamer.com/docs/guides/reserved-names/).

## Scripting

Scripting was rebuilt. It has functions, assignments, local values, conditions, loops, blocks, logic, `return`, `break`, `continue` and error handling. Separate statements with semicolons, even on separate lines.

A loop or condition that produces no value isn't an empty vector or any other value; using it where a value is needed is an error. If your scripts relied on undocumented 1.x behavior, test them again.

## Assumptions

Assumptions were rewritten around ranges of real numbers, and are public through `nerdamer/assumptions`. Repeated assumptions about one variable combine; one that contradicts them is an error. They apply everywhere until you clear them, and comparisons and sign-dependent simplifications use them. See [Assumptions](https://nerdamer.com/docs/guides/assumptions/).

## Numbers

Numbers are handled differently inside: `BigInt` for large integers, Decimal.js for decimals, exact fractions where possible, and new complex-number code. If your code used undocumented 1.x number objects, use the public number classes instead.

## Polynomials, factoring and Gröbner bases

Polynomials, GCDs, factoring, polynomial solving, partial fractions and Gröbner bases are all new code. Through Notation nothing changes; code that imported undocumented 1.x algorithms should use `nerdamer/algebra`, `nerdamer/solve` and `nerdamer/advanced`.

## Deferred simplification

The `DEFER_SIMPLIFICATION` setting keeps an expression in the form it was typed, for example for teaching tools that show simplification steps. It has limits: don't assume a deferred parse and a normal one produce the same structure.

## Error messages in other languages

Error messages come in English, Spanish, French, German, Portuguese, Italian and Dutch (`eng`, `spa`, `fra`, `deu`, `por`, `ita`, `nld`). The standard browser bundle has only English; build with `--env language=...` or `--env language=all` to include others.

## New, or easier to use

From TypeScript you can now use directly:

- `Equation`, `Rational` and `Polynomial`;
- sparse polynomials and Gröbner bases;
- `PolynomialSolver`, `SolutionSet` and the other solver classes;
- `ValuesSet`, `Dictionary`, `Collection`, `Matrix` and `Vector`;
- assumptions;
- parser functions;
- error classes, also on `nerdamer.errors`;
- types for every import path.

## License

Nerdamer 2 is licensed under the Apache License 2.0. Nerdamer 1.x used the MIT License.

## Checklist

1. Remove the `Algebra`, `Calculus`, `Solve` and `Extra` imports.
2. Remove the third and fourth arguments of `nerdamer(...)`.
3. Replace the expression history with your own variables.
4. Check the type of results where input can be an equation, vector, matrix, set or dictionary.
5. Update code that read the old system-solving arrays.
6. Replace `getCore()`, `register()` and similar hooks with the public functions and import paths.
7. Use the statistics functions on `nerdamer` or from `nerdamer/statistics` instead of loading Extra.
8. Test scripts that relied on undocumented loop or condition behavior.
9. Test code that relied on undocumented behavior of numbers, polynomials, solving, assumptions or sets.
10. Choose the complete package, or the parser package if it has everything you use.
11. Run your own tests against version 2 before upgrading production code.

Documentation: https://nerdamer.com/docs/. Source and issues: https://github.com/jiggzson/nerdamer.
