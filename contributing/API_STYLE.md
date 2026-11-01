# Public API style

Nerdamer's public API should reflect mathematical meaning while remaining natural to use in JavaScript and TypeScript. Favor consistency while preserving established behavior; changes to names or types should offer a practical benefit.

## Results

- Return the most specific accurate Nerdamer type, such as `Expression`, `Equation`, `SolutionSet`, `Vector`, or `Dictionary`. Use `ParserEntity` when the result genuinely has several possible types.
- Keep mathematical results usable as objects, so users can work with them directly without converting to strings and parsing again.
- Preserve meaningful distinctions among no solution, an incomplete result, a family of solutions, and an unsupported operation when the API can represent them.
- Use the same underlying entities for direct functions and parser notation when they describe the same operation.
- Avoid new wrappers or result containers when an existing Nerdamer type already represents the answer.

## Inputs and types

- Accept established input types, such as `ExpressionInput`, only when the function actually supports their values.
- Convert accepted inputs at the API boundary, rather than repeatedly converting inside an algorithm.
- Preserve mathematical meaning during conversions; treat an `Equation` as an ordinary expression only where an operation explicitly requires it.
- TypeScript declarations must match runtime behavior, including optional results, callback arguments, and returned classes.
- Use type guards for parser results where appropriate. Avoid requiring users to inspect internal tags or make repeated casts.

## Containers and ownership

- Expose straightforward ways to inspect size, access values, and iterate through public collections.
- A callback used only to visit elements should not have to return a dummy replacement value.
- Make mutation predictable. Document whether methods change the receiver, return an independent result, or share nested values.
- Use `this` for mutating fluent methods when appropriate. Expose writable internal storage only when that access is an intentional part of the public API.
- Explain the behavior of `copy()` and array/object snapshots when ownership matters.

## Names and compatibility

- Use clear mathematical names and ordinary JavaScript conventions for new direct APIs.
- Parser notation may use lowercase names such as `isprime`, while direct TypeScript functions may use `isPrime`. Preserve established mathematical capitalization such as `Si` and `Ei`.
- Retain useful compatibility aliases, but have them call one implementation rather than duplicate algorithms.
- Add parser functions as object methods when the operation makes sense for the receiving type.
- Avoid new aliases or cosmetic public renames without a user-facing benefit.

## Errors and mathematical behavior

- Reject invalid or unsupported inputs deliberately using the appropriate public Nerdamer error where practical.
- Distinguish unexpected programming errors from ordinary mathematical failures.
- Keep exact and approximate results distinct. Apply real-domain identities to complex values only when their principal-branch conditions are satisfied.
- Represent unknown results as unknown and numerical approximations as approximate.
- Explain shared settings, constants, user functions, and assumptions when their state affects later calls.

## Review

Before adding or changing a public API, check its actual runtime result, supported imports, TypeScript declarations, mutation behavior, errors, and existing compatibility names. Exercise examples through the published package interface, not only internal source imports.

Improve genuine usability problems through focused changes and tests. Change established APIs only when a demonstrated improvement justifies the compatibility cost.
