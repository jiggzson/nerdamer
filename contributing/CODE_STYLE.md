# Code style

Nerdamer code should be easy to understand, locate, and maintain. These preferences guide new work; they are not reasons to rename or reorganize working code without a practical benefit.

## Naming

- Use `camelCase` for TypeScript functions, methods, and variables; `PascalCase` for classes and types.
- Prefer short, descriptive names, usually two words. Use three or more when the meaning would otherwise be unclear. Let the class or module provide context for method names.
- Use established mathematical terminology when it is more precise.
- Name Boolean values and functions so they read as conditions, such as `isZero` or `hasVariable`.
- Avoid underscores in new TypeScript API names. Existing mathematical notation and compatibility names may differ.
- For ordinary nested loops, `i`, `j`, and `k` are convenient defaults, usually in that order. Use `n`, `k`, or another conventional variable whenever it makes the code clearer, particularly when following mathematical notation or implementing a well-known algorithm. Descriptive names are also useful when an index has a specific role.
- Keep established public names and accepted internal names. Avoid cosmetic renaming.

Keep the appropriate naming convention for each interface: parser functions follow mathematical notation (for example, `isprime`), while direct JavaScript and TypeScript methods may use `isPrime`.

## File names and placement

- Name files centered on a class with `PascalCase`, such as `Expression.ts`.
- Use short `camelCase` names for focused functional modules, such as `growth.ts` and `texScope.ts`.
- Prefer kebab-case for new specification filenames, such as `module-initialization.spec.ts`. Retain established test filenames unless a separate change provides a practical benefit.
- Use `index.ts` for a module entry point, not as a generic place to put unrelated code.

Place code with its actual owner:

| Area | Location |
| --- | --- |
| Shared entities, parser, constants, conversion | `src/core/` |
| General mathematics | `src/math/` |
| Algebra and polynomial algorithms | `src/algebra/` |
| Calculus | `src/calculus/` |
| Solving | `src/solve/` |
| Special and statistical functions | `src/special/`, `src/statistics/` |
| Public package entry points | `src/api/` |
| Tests and development tools | `spec/`, `tools/` |

Prefer imports from the module that defines an internal function rather than indirect re-export chains. Public consumers should use the supported package entry points. Avoid catchall utility modules when an existing domain has clear ownership.

## File boundaries

Organize by responsibility, **not line count**. Extract work only when it has a distinct purpose and a safe dependency boundary.

For example, `growth.ts` classifies behavior at infinity while `limit.ts` evaluates limits. Parser syntax processing belongs in `syntax.ts`, while the Parser retains its established interface.

Before moving code, check callers, mutable state, exports, transitive imports, initialization order, and possible cycles. Preserve user-facing behavior. Keep cohesive stateful classes together and avoid unnecessary wrappers or tiny single-purpose files.

## Implementation

- Search for existing functions and classes before introducing new helpers or abstractions.
- Use precise types; avoid broad casts or suppressing type errors to hide a problem.
- Favor straightforward control flow. A result variable such as `retval` can clarify a longer function; a direct return is better for a simple predicate.
- Preserve mathematical validity: exact versus approximate results, domain restrictions, and complex principal-branch behavior matter.
- Keep tests focused on mathematical correctness rather than incidental formatting unless formatting is being tested.
- Write comments that explain non-obvious reasoning, not obvious syntax. Preserve useful existing explanations.

Follow the conventions in the surrounding code when they remain clear and correct. Handle broader style changes separately from functional fixes.
