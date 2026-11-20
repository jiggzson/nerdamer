# Spec organization

The `spec/` tree is organized by the behavior or mathematical domain being protected. A test should have one obvious home based on what it validates, not based on which source file implements it or how the test was discovered.

## Placement rules

- Put mathematical behavior with its mathematical domain: algebra, calculus, solving, linear algebra, sets, and assumptions.
- Put parser mechanics with parser tests, formatting behavior with formatting tests, public-interface contracts with API tests, and generic containers with collection tests.
- Keep tests covering multiple domains separate only when necessary.
- Name tests for the behavior or validity condition they check, rather than using broad labels.
- Do not create a new file for every method or every bug. Split files when they contain multiple coherent contracts that are easier to understand independently.
- Use lowercase kebab-case for every spec filename, including class-focused suites (`matrix.spec.ts`, `values-set.spec.ts`) and behavior-focused suites (`tokenizer.spec.ts`, `elimination.spec.ts`). Separate words with dashes; avoid PascalCase, camelCase, and extra dotted qualifiers.

## Regression provenance

Ordinary specs should not use `legacy`, `historical`, `prime`, issue-number ranges, or similar provenance labels in filenames, directory names, `describe` blocks, or test titles.

When a test exists because of a reported issue, keep the provenance as a nearby comment containing the actual issue URL when that context is useful, for example:

```ts
// Regression: https://github.com/jiggzson/nerdamer/issues/651
```

or the corresponding issue URL from `together-science/nerdamer-prime`.

The former `spec/_unsorted/` directory was transitional and has been removed. Add ordinary suites directly to their logical feature area and retain issue URLs where useful. The separate historical archive and `artifacts/` trees remain the source of closed-issue provenance; references there to earlier spec paths record the review state at the time and do not define the permanent test taxonomy.

## Functional tests versus performance

The `spec/` tree verifies mathematical validity, expected behavior, and public API contracts. Performance benchmarks do not belong here. If a benchmark framework is added later, it should live outside `spec/` so machine-dependent timing does not make the correctness suite unstable.

## Migration discipline

The reorganization should be reviewable in stages:

1. Move suites whose destination is unambiguous without changing assertions.
2. Split oversized or catch-all suites along coherent behavioral boundaries.
3. Move active regression tests into their logical feature suites and retain issue URLs where useful.
4. Consolidate genuinely duplicate coverage only after confirming that the protected contracts are equivalent.
5. Review test isolation and shared mutable state separately from mechanical file moves.

Do not combine broad assertion rewrites, production-code changes, or speculative cleanup with mechanical suite relocation.
