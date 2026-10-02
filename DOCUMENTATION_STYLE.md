# Nerdamer 2.0 Documentation Style

This document defines the documentation standard for Nerdamer 2.0. It applies to public API TSDoc, source comments for important algorithmic internals, and conceptual Markdown guides.

The governing approach is **Public API + Important Algorithmic Internals**. The goal is not maximum comment coverage. The goal is complete, accurate documentation where understanding matters: supported APIs, mathematical restrictions, ownership and mutation, precision, branch behavior, assumptions, sets, solver behavior, and non-obvious algorithms.

This guide supplements `AGENTS.md`; repository-wide instructions remain controlling. The current source-level prose reference is `src/core/functions/expand/expand.ts`. Treat that file as a reference for voice, explanatory depth, and placement of algorithmic commentary—not as a literal TSDoc template.

## Reference style: `expand.ts`

The strongest commentary in `src/core/functions/expand/expand.ts` has several characteristics that should carry through the documentation pass:

- it explains transformations in the order a maintainer needs to reason about them;
- it uses concrete symbolic examples instead of abstract descriptions when an example makes the algorithm easier to follow;
- it preserves intermediate representations when those representations are important to understanding the algorithm;
- it explains safeguards and recursion choices near the branch where they matter;
- it is comfortable using several sentences, a small table, or a multi-line comment when a shorter comment would lose the reasoning;
- it reads like a developer explaining the mathematical intent of the implementation, rather than like generated API boilerplate.

For example, the power-expansion commentary does more than say that the code expands a power. It explains the flattened row representation, shows the coefficient slot, walks through the multiplication table, and describes how the parser is used after reconstruction. That level of explanation is appropriate when the representation is essential to understanding the algorithm.

Do not copy the weaker mechanical aspects of the current file merely for consistency. Existing blocks such as bare `@param x` or empty `@returns` tags are incomplete for the new public documentation standard. Likewise, comments that only narrate an obvious assignment or loop should not be multiplied across the repository. Preserve useful existing comments, but improve their TSDoc structure when they are part of the active documentation batch.

The practical rule is:

> Preserve the human explanation and mathematical reasoning of `expand.ts`; improve the API metadata so it renders as complete TSDoc in TypeDoc.

## 1. General standard

### 1.1 Document behavior, not syntax

TSDoc should explain the contract a caller needs to understand. Do not merely restate a method name or an obvious TypeScript type.

Avoid comments such as:

```ts
/**
 * Gets the numerator.
 */
```

when the actual behavior has meaningful mathematical, ownership, representation, or error semantics that should be described.

Likewise, avoid parameter documentation such as:

```ts
/**
 * @param x - A string.
 */
```

Prefer:

```ts
/**
 * @param variable - The polynomial variable whose degree should be returned.
 */
```

### 1.2 Prefer complete explanations over terse uniformity

Do not shorten useful comments merely to make the repository look consistent. Existing comments may contain mathematical reasoning, historical context, invariants, or warnings that are more valuable than uniform comment length.

When revising a meaningful comment:

- preserve all useful information;
- correct statements that are no longer true;
- expand the explanation when the contract has become more nuanced;
- remove information only when it is demonstrably obsolete or incorrect.

Do not replace an explanatory comment with generic filler TSDoc.

### 1.3 Write naturally

Comments should read like a maintainer explaining the code to another capable developer. Use ordinary sentences and paragraphs. Important contracts or algorithms may need several paragraphs.

Prefer comments that explain:

- why a branch or transformation exists;
- what mathematical case is being handled;
- what invariant must remain true;
- why an apparently simpler transformation is unsafe;
- what precision or representation decision is deliberate;
- why a candidate result requires verification;
- how a non-obvious step fits into the larger algorithm.

Avoid narrating obvious syntax line by line.

### 1.4 Accuracy is more important than coverage

Do not add documentation simply to increase the number of documented symbols. A misleading comment is worse than no comment.

If a contract is uncertain, inspect the implementation, tests, call sites, and export surface before documenting it. Documentation must not silently invent guarantees that the code does not provide.

## 2. What should be documented

### 2.1 Supported public API

Document everything users are intentionally expected to import, instantiate, call, implement, pass, or receive from a supported API, including as applicable:

- classes and constructors;
- public methods and properties;
- top-level functions and algorithms;
- interfaces and type aliases;
- enums and constants;
- public errors;
- option and result types;
- Nerdamer-defined types exposed through public signatures.

Use the public API closure rule:

> If a supported public constructor, method, property, argument, or return value exposes a Nerdamer-defined class or type, that class or type must itself be publicly importable and documented.

A source-level `export` does not automatically make a symbol a supported public API.

### 2.2 Important algorithmic internals

Document internal logic when the mathematical or architectural reasoning is not obvious from the code itself.

Typical candidates include:

- branch-sensitive power, logarithm, root, and complex-number logic;
- polynomial root algorithms;
- Groebner-basis strategy;
- integration and transformation strategies;
- assumption inference;
- finite-set membership and uniqueness semantics;
- solver candidate verification;
- precision-sensitive numerical routines;
- normalization or canonicalization steps whose ordering matters;
- performance-sensitive shortcuts whose correctness is non-obvious.

Do not comment trivial assignments, obvious loops, simple delegation, or self-explanatory predicates merely for coverage.

### 2.3 Conceptual guides

Do not force repository-wide concepts into individual TSDoc blocks. Use separate Markdown guides for material that spans many APIs.

Likely guides include:

- expression model;
- building algorithms directly;
- precision;
- principal branches;
- assumptions;
- finite sets;
- polynomial API;
- Groebner bases;
- solvers;
- calculus;
- matrices and vectors;
- migration from Nerdamer 1.x.

Use `@see` from TSDoc when a guide or related API materially helps the reader.

## 3. Public API TSDoc

### 3.1 Opening description

Begin with the operation's real purpose in mathematical or library terms. For substantial APIs, follow the summary with the details needed to use the API correctly.

Relevant topics may include:

- accepted symbolic forms;
- normalization or conversion performed internally;
- supported coefficient or value domains;
- mutation and ownership;
- exact versus approximate behavior;
- precision rules;
- principal-branch conventions;
- assumptions used or required;
- convergence behavior;
- error conditions;
- limitations;
- returned representation;
- ordering, multiplicity, or canonicalization guarantees;
- interactions with related APIs.

Not every method needs every item. Include only information that is meaningful to the contract.

### 3.2 Parameters

Describe what each parameter means to the operation. Do not restate its TypeScript type unless the interpretation of that type is itself significant.

For option objects, document semantic effects and important interactions between options, especially when an option changes precision, branch behavior, convergence, normalization, or output representation.

### 3.3 Return values

Use `@returns` when the returned value needs explanation beyond its static type.

Where relevant, explain:

- exact versus approximate output;
- whether the result is a new object or an existing reference;
- copy depth or shared nested state;
- canonical-form guarantees;
- ordering or insertion-order behavior;
- multiplicity preservation;
- symbolic versus numerical representation;
- representation of unknown or indeterminate results.

Do not add a redundant `@returns` line such as “The result.”

### 3.4 Errors

Use `@throws` when an error is part of the meaningful contract, and explain the condition that causes it.

For example:

```ts
/**
 * @throws {@link DivisionByZeroError}
 * Thrown when the divisor is exactly zero. Numerical tolerances are not used
 * to classify a small nonzero value as zero.
 */
```

Do not merely list an error class with no explanation.

### 3.5 Examples

Use examples when they clarify intended use, composition, or a non-obvious contract.

Examples are especially valuable for:

- `Expression`;
- `Polynomial`;
- `PolynomialSolver`;
- Groebner algorithms;
- assumptions;
- finite sets;
- matrices and vectors;
- calculus APIs.

Examples should be realistic, focused, short enough to scan, and consistent with the actual supported import surface. Do not add examples mechanically to every simple accessor or predicate.

### 3.6 TSDoc and TypeDoc formatting

Public API comments must be valid, predictable TSDoc that renders cleanly through TypeDoc. Documentation should be written for both source readers and generated HTML; neither audience should receive a degraded version of the contract.

Use `/** ... */` documentation comments for declarations intended for TypeDoc. Ordinary implementation commentary may continue to use `//` or non-documentation block comments as appropriate.

Use the comment body before the first block tag as the summary. The summary should normally be one focused paragraph that identifies the operation and its most important semantic distinction. Put substantial qualifications and secondary contract details under `@remarks` instead of forcing the entire explanation into the summary.

Use at most one `@remarks` block per declaration. `@remarks` is the appropriate place for material such as:

- mathematical domain or branch restrictions;
- mutation, copying, and ownership behavior that needs more than one sentence;
- precision and convergence rules;
- canonicalization or normalization guarantees;
- important interactions with assumptions or global/scoped state;
- algorithm selection behavior visible to callers;
- limitations that are too substantial for the opening summary.

Do not create `@remarks` merely to satisfy a template. If the summary, parameters, and return documentation fully communicate a simple contract, omit it.

### 3.7 Tag usage and ordering

Prefer the following order when the corresponding sections are useful:

```text
Summary

@remarks
@typeParam
@param
@returns
@throws
@example
@see
```

This ordering is a readability convention, not a requirement to include every tag. Omit sections that add no information.

Use:

- `@typeParam` to explain the semantic role or constraint of a public generic type parameter when the TypeScript declaration is not self-explanatory;
- `@param name - Description` for parameter semantics;
- `@returns` for meaningful result semantics;
- one `@throws` block for each materially distinct exception condition;
- `@example` for examples that materially improve use of the API;
- `@see` for genuinely useful related APIs or guides.

Do not include TypeScript type annotations in `@param`, `@returns`, or `@typeParam` documentation merely to repeat the signature.

### 3.8 Links

Use TSDoc inline links for declarations that should be navigable in generated HTML:

```ts
{@link Polynomial}
{@link Polynomial.degree}
{@link Polynomial.totalDegree | total degree}
```

Prefer links that TypeDoc can resolve through the actual public symbol graph. If a link does not resolve, first determine whether the target is missing from the public documentation surface rather than weakening the comment to plain text. A broken link may reveal a public API closure problem.

When an `@see` entry should link to another API, write the link explicitly:

```ts
@see {@link Polynomial.totalDegree}
```

Do not assume that plain text following `@see` will become a link.

For errors, prefer:

```ts
@throws {@link DivisionByZeroError}
Thrown when the divisor is exactly zero.
```

Do not use JSDoc-style type braces such as `@throws {DivisionByZeroError}` in new TSDoc.

### 3.9 Markdown and code examples

TypeDoc documentation may use Markdown where it improves readability. Keep the structure restrained so the generated API pages remain easy to scan.

Use fenced code blocks for code examples. TypeDoc expects fenced code blocks; do not rely on indentation-based code blocks. Specify `ts` for TypeScript examples:

````ts
/**
 * @example
 * ```ts
 * const polynomial = new Polynomial(...);
 * const degree = polynomial.degree('x');
 * ```
 */
````

Use backticks for identifiers, literal values, short expressions, and parameter names. Do not use raw HTML merely to force spacing or presentation that Markdown/TSDoc can express normally.

Examples must use supported imports and APIs. During the pre-freeze documentation pass, an example that requires an accidental or unresolved internal export should be treated as a public-surface issue, not silently written as though that import were supported.

### 3.10 Complete TSDoc example

The following is a shape to use when an API genuinely needs this level of detail. It is not a mandatory template for every method:

````ts
/**
 * Returns the degree of the polynomial with respect to the requested variable.
 *
 * @remarks
 * For a multivariate polynomial, this measures only powers of `variable`; the
 * remaining variables continue to participate in the coefficients. This
 * operation does not modify the polynomial.
 *
 * @param variable - The polynomial variable whose degree should be measured.
 * @returns The highest exponent of `variable` present in the polynomial.
 *
 * @throws {@link InvalidVariableError}
 * Thrown when `variable` cannot be interpreted as a supported polynomial
 * variable.
 *
 * @example
 * ```ts
 * const polynomial = new Polynomial(...);
 * const degree = polynomial.degree('x');
 * ```
 *
 * @see {@link Polynomial.totalDegree}
 */
````

The final documentation for a real method must reflect its verified implementation and types; do not copy example contracts or error names into source merely because they appear in this guide.

### 3.11 Generated HTML is part of the review

A documentation batch is not complete merely because the source comments look good. At meaningful checkpoints, generate the TypeDoc HTML and inspect the rendered result. Review at least:

- summary text on index/listing views;
- `@remarks` paragraph and list rendering;
- parameter and return sections;
- exception sections;
- fenced code examples and syntax highlighting;
- symbol links and `@see` links;
- overloaded signatures;
- inherited documentation where applicable;
- public types referenced by signatures but missing from the generated API;
- headings or blocks that became visually noisy because TSDoc was over-structured.

Source formatting may be revised when necessary to improve the generated output, but never by deleting meaningful contract information.

### 3.12 Current TypeDoc setup and validation policy

The repository currently declares TypeDoc `^0.28.17` and `typedoc-material-theme` `^1.4.1` as development dependencies. There is no dedicated `typedoc.json` or `tsdoc.json` configuration file at present; the documentation commands are defined directly in `package.json`:

```text
npm run docs
npm run docs:api
npm run docs:html
npm run docs:all
```

`src/index.ts` and `src/typedoc.entry.ts` currently act as the documentation entry points for the broader generated API. `generated/typedoc/typedoc.json` is generated reflection output, not the TypeDoc configuration source.

During documentation batches, preserve the existing build arrangement unless a separate documentation-infrastructure change is intentionally approved. Do not silently add a new configuration file merely to make comments pass.

At meaningful checkpoints, run `npm run docs:html` and inspect the generated HTML. When the public surface has become sufficiently clean, TypeDoc validation should be tightened deliberately so documentation defects are surfaced during the build. At minimum, the eventual validation policy should cover:

- unresolved `{@link}` targets;
- invalid documentation paths;
- publicly referenced symbols that are missing from the generated documentation surface.

Treating validation warnings as errors is desirable once the existing documentation has been brought to a clean baseline. Do not enable a repository-wide undocumented-symbol requirement merely to force comment coverage. That can encourage filler TSDoc on internal or trivial declarations and conflicts with this guide's selective documentation approach.

Any TypeDoc configuration change must be made as its own intentional repository change after inspecting the generated output and the public-surface matrix. Documentation comments should not be shaped around suppressing tooling warnings that reveal a genuine export or API-closure problem.

## 4. Mutation, copying, and ownership

Nerdamer 2.0 intentionally supports direct use of the object model. Mutation and ownership are therefore part of the public contract.

For classes such as `Expression`, `Equation`, `Rational`, `Complex`, `Polynomial`, `Term`, `Matrix`, `Vector`, `Collection`, `ValuesSet`, and `SolutionSet`, state where relevant whether an operation:

- mutates `this`;
- returns `this`;
- returns a new object;
- returns a copy;
- returns an internal reference;
- preserves object identity;
- preserves insertion order;
- preserves canonical form;
- copies nested values or shares them.

Do not infer ownership behavior from naming alone. Verify it in the implementation and tests.

Documentation must not loosen or redefine an existing mutation or identity contract.

## 5. Mathematical restrictions

### 5.1 State domain- and branch-dependent behavior explicitly

Document restrictions and conventions for operations whose correctness depends on domain, assumptions, or principal branches.

This includes, among other areas:

- principal powers;
- logarithms;
- square roots;
- conjugation;
- complex functions;
- assumption-dependent simplification;
- symbolic equality;
- set membership;
- solver candidate verification.

Do not present a branch-unsafe historical simplification as a universal identity. Principal-branch correctness takes precedence over preserving historically convenient but mathematically unsafe output.

### 5.2 Distinguish guarantees from heuristics

If an algorithm is heuristic, incomplete, numerically iterative, or conservative, say so.

Examples include:

- solver convergence that depends on working precision or initialization;
- symbolic comparison that may be unknown;
- assumption inference that intentionally does not prove arbitrary propositions;
- symbolic set membership that cannot always be decided;
- integration routines that search a finite set of strategies.

Do not imply completeness when the implementation does not provide it.

### 5.3 Explain exactness and approximation

When exact symbolic arithmetic and approximate numerical arithmetic meet, document the boundary.

Relevant topics may include:

- rational versus decimal inputs;
- solver working precision;
- parser or Rational precision;
- conversion between exact and approximate forms;
- tolerance-based convergence;
- whether a tolerance affects mathematical classification or only a numerical stopping rule.

Precision rules should be explicit enough that callers can reason about or reproduce results.

## 6. Algorithmic source comments

### 6.1 Explain why, not merely what

Inline and block comments should explain why a non-obvious step exists, what invariant it preserves, or what mathematical case it handles.

Prefer the level of explanation illustrated by:

```ts
// Keep the unsimplified candidate until verification is complete. A premature
// rewrite can discard restrictions that are still needed to reject an
// extraneous solution.
```

rather than:

```ts
// Save candidate.
```

### 6.2 Comment at the right level

Use the smallest comment form that fully explains the idea:

- a short inline comment for a local subtlety;
- a paragraph before a multi-step branch;
- TSDoc for an important reusable algorithm or helper;
- a conceptual guide for architecture spanning several files.

Do not duplicate the same explanation at every level unless each location needs a distinct part of the contract.

### 6.3 Preserve existing reasoning

Existing algorithm comments may explain cases that are no longer obvious from the current code shape. Preserve that reasoning when documenting or refactoring nearby code.

If implementation behavior changes in a separate approved workstream, revise the comment so it remains true. Do not silently remove the explanation because the surrounding code was rewritten.

### 6.4 Do not narrate obvious code

Avoid comments that simply state that a local variable is assigned, an index is incremented, a loop iterates, or a value is returned. Comments should reduce the effort required to understand the code rather than increase the amount of text a reader must filter.

## 7. Style and tone

Use complete sentences and ordinary prose. Sentence fragments are acceptable only when they are genuinely clearer, such as compact labels or conventional mathematical notation.

Avoid generated-sounding filler such as:

- “This method handles the operation.”
- “This function performs the calculation.”
- “Returns the computed result.”
- “Checks if the condition is true.”
- “Helper function for processing expressions.”

Use the terminology already established by the implementation and public API. Do not casually create a second vocabulary for an existing abstraction.

Use mathematical notation when it makes the explanation clearer, but include enough prose to connect the notation to the implementation behavior.

## 8. Documentation depth by API area

### 8.1 Core

Core classes should document construction, representation, mutation/copy behavior, normalization, comparison semantics, and conversion boundaries where relevant.

Priority areas include:

- `Expression`;
- `Equation`;
- `Rational`;
- `Complex`;
- `Parser`;
- assumptions;
- `Converter`.

### 8.2 Algebra

Algebra APIs should document accepted forms, symbolic restrictions, normalization, variable ordering where relevant, and output guarantees.

Priority areas include:

- `Polynomial`;
- `Term`;
- `SparsePolynomial`;
- `factor`;
- `simplify`;
- `gcd`;
- `lcm`;
- `partfrac`;
- Groebner APIs and their public option, result, and error types.

### 8.3 Solvers

Solver documentation should be detailed enough for callers to understand how solutions are obtained and represented.

For a substantial solver such as `PolynomialSolver`, cover as applicable:

- accepted input representation;
- coefficient support;
- analytic versus numerical paths;
- solver working precision;
- the deliberate separation between solver precision and parser/Rational precision;
- convergence behavior;
- root representation;
- multiplicity handling;
- candidate verification;
- symbolic versus numerical results;
- errors;
- important limitations.

Priority solver APIs include `PolynomialSolver`, `FunctionSolver`, `MultivariateSolver`, `SymbolicSolver`, and `SolutionSet`.

### 8.4 Calculus

Document calculus according to its function-oriented architecture. Do not introduce calculus classes merely for symmetry.

Priority functions include `diff`, `integrate`, `limit`, `laplace`, `ilaplace`, and `LimitDir` where public.

Document strategy limitations, assumptions, singular cases, and branch/domain behavior when they affect correctness.

### 8.5 Structures and linear algebra

Document element requirements, mutability, dimensional constraints, copying behavior, ordering, and exactness where relevant.

Priority APIs include `Matrix`, `Vector`, `Collection`, `Dictionary`, `ValuesSet`, `SolutionSet`, and related public set types.

## 9. Assumptions and finite sets

These areas are still scheduled for 2.0 stabilization. Documentation must remain conservative until their contracts are finalized.

### 9.1 Assumptions

Do not imply theorem-prover-level inference. The target is reliable interval/domain assumptions, conservative inference, and explicit unknown results.

Once finalized, documentation should clearly state:

- supported assumption vocabulary;
- global versus scoped state;
- true/false/unknown comparison semantics;
- contradiction behavior;
- what simplifications consume assumptions;
- what the system intentionally does not infer.

Do not document identical admissible ranges as proof that two variables are equal.

### 9.2 Finite sets

Document finite-set invariants and symbolic membership carefully.

Where applicable, explain:

- uniqueness guarantees;
- mutation paths that preserve uniqueness;
- insertion order;
- equality and membership semantics;
- copy/append behavior;
- exclusions and raw-root preservation in `SolutionSet`;
- union, intersection, difference, symmetric difference, and disjointness once finalized;
- subset/superset semantics once finalized;
- whether inherited arithmetic is intentionally supported.

Do not imply a general infinite symbolic-set engine where Nerdamer only supports explicit finite or specialized sets.

## 10. Public surface and stability

Documentation can reveal accidental exports or missing public dependencies, but it must not silently freeze the package surface.

Public-surface review should classify candidates separately as:

- Root stable;
- Domain stable;
- Advanced stable;
- Internal.

When a supported public signature exposes an internal Nerdamer-defined type, flag that as a public-surface problem rather than documenting an impossible import path as intentional.

## 11. Documentation batch workflow

Documentation work should proceed by coherent class or subsystem, not one method at a time and not as an unconstrained repository-wide sweep.

For each batch:

1. identify the supported/public declarations and important internals in scope;
2. inspect the implementation, tests, call sites, exports, and existing comments before writing contracts;
3. classify each declaration as requiring substantial TSDoc, concise TSDoc, algorithmic source commentary, or no new comment;
4. preserve and integrate all meaningful existing commentary;
5. document the batch as a whole so terminology, ownership language, and mathematical restrictions remain consistent;
6. run TypeScript validation appropriate to the batch;
7. generate TypeDoc HTML at meaningful checkpoints and inspect the rendered pages;
8. review the diff specifically for lost reasoning, filler prose, accidental contract claims, and unrelated edits.

Do not require conversational approval after every method. The review unit is the coherent batch. Stop within a batch only when the implementation does not support a safe documentation claim, a public-surface decision is required, or another `AGENTS.md` stop condition is reached.

This workflow is also the basis for later Codex delegation. Codex should receive bounded module/class batches and this style guide, not an instruction to document the entire repository autonomously.

## 12. Rules for documentation edits

Documentation-only work must not alter:

- mathematical semantics;
- public or internal contracts;
- mutation/copy behavior;
- object identity;
- formatting;
- precision;
- errors;
- branch safety;
- public exports;
- algorithm selection.

If accurate documentation exposes a contract defect, record it for the appropriate stabilization or bug-fix workstream instead of silently changing behavior in the documentation batch.

Do not delete files or directories without explicit approval.

Before adding documentation infrastructure or helpers, search for an existing repository mechanism that can be reused or extended.

When touching code near existing comments, preserve those comments or revise them so they remain accurate. Never remove meaningful commentary incidentally while reformatting TSDoc.

## 13. Anti-patterns

Do not:

- document every private helper simply because TypeDoc can see it;
- restate TypeScript types in prose;
- add `@returns` with no information beyond the signature;
- list errors without their triggering conditions;
- add examples that merely echo the method name;
- shorten existing explanations for visual consistency;
- document branch-unsafe identities as generally valid;
- claim symbolic completeness that the implementation does not provide;
- hide mutation or shared-reference behavior;
- use comments to paper over behavior that should be tracked as a defect;
- turn implementation exports into promised public APIs without a public-surface decision;
- add comments solely to increase documentation coverage.

## 14. Review checklist

Before considering a documentation batch complete, review each changed public API or important algorithm.

### Public API

- Does the documentation explain the real operation rather than its name?
- Is the supported input domain clear?
- Is mutation, copying, ownership, or identity clear where relevant?
- Are exactness and precision rules clear where relevant?
- Are branch and domain restrictions stated where relevant?
- Are errors explained by cause?
- Is the returned representation clear?
- Are ordering, multiplicity, canonicalization, or uniqueness guarantees stated where relevant?
- Would an example materially improve understanding?
- Does the API expose another Nerdamer-defined type that must itself be public and documented?

### Algorithmic internals

- Does the comment explain why the non-obvious logic exists?
- Does it preserve useful reasoning from existing comments?
- Does it distinguish guarantees from heuristics?
- Does it explain precision-sensitive or branch-sensitive decisions where relevant?
- Would the comment still help a maintainer who already understands the syntax?
- Is the explanation placed at the level where the concept is easiest to understand?

### Editorial quality

- Does the prose sound natural rather than templated?
- Has any meaningful information been condensed away?
- Is terminology consistent with the codebase?
- Is every statement supported by implementation, tests, or an intentional contract?
- Is conceptual material kept out of TSDoc when a guide is the better home?
- Does the comment use valid TSDoc tags rather than JSDoc-only type syntax?
- Do all intended API links resolve in TypeDoc?
- Does the generated HTML preserve paragraph structure, examples, lists, and mathematical qualifications clearly?
- Has the rendered TypeDoc page been inspected at a meaningful batch checkpoint?

## 15. Standard of completion

The documentation pass is successful when Nerdamer 2.0 presents a coherent public API voice and a reader can understand not only how to call the library, but also the contracts that matter when building algorithms directly with its classes and mathematical routines.

The intended result is a serious symbolic mathematics library whose parser, object model, algorithms, precision behavior, and mathematical restrictions are understandable and intentionally supported.
