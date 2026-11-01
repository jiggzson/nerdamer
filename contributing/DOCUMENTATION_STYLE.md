# Documentation style

Write for the reader, in clear language. The README introduces Nerdamer and summarizes its capabilities; detailed usage belongs in dedicated documentation and API references.

Document public behavior and important mathematical reasoning, not every helper or statement.

## What to explain

- For public functions, describe what they do, the supported inputs, and what they return.
- Explain mathematical restrictions where they affect results: real or complex domains, principal branches, assumptions, exact versus approximate values, and convergence.
- State whether an operation changes its inputs, shares internal values, or returns an independent result when that distinction matters.
- Explain failures, unsupported cases, and the verified range of inputs handled by solvers and simplifiers.
- For non-obvious algorithms, explain the reasoning, safeguards, and relevant intermediate representations. Let self-explanatory code speak for itself.
- Preserve useful existing explanations when editing nearby code. Remove information only when it is inaccurate or unnecessary.

## Writing and examples

Use ordinary sentences and established mathematical terms. Start with the main point; add detail only when it helps the reader understand or use the feature.

Prefer a short, representative example over a large catalog of examples. Show real supported APIs and current output behavior; verify samples against the code and tests. Avoid internal source imports in examples intended for package users.

Use concise headings and lists, adding descriptions when they convey information beyond the function name and TypeScript signature.

## TSDoc

Use `/** ... */` for declarations included in generated API documentation. Ordinary implementation notes may use `//` comments.

- Begin with a short explanation of the operation.
- Use `@remarks` for substantial qualifications better explained outside the opening summary.
- Use `@param` to explain the purpose of a parameter, not just repeat its type.
- Use `@returns` when the result's meaning, exactness, ownership, or limitations need explanation.
- Use `@throws` for meaningful errors, including what causes them.
- Use `@example` when a working example makes the API clearer.
- Add links to related public symbols only when they are useful and resolve correctly in generated documentation.

Include TSDoc tags where they add useful information. Keep longer mathematical explanations when they clarify behavior.

## Public information and links

Public-facing material should describe current, supported capabilities. Keep internal project instructions, research notes, and temporary development discussions out of user documentation.

For any necessary Nerdamer repository links, use the public `jiggzson/nerdamer` repository, not a personal development repository. Avoid unnecessary cross-links among internal Markdown files.

## Documentation checks

The repository uses `typedoc.json` to configure its generated API reference. Available npm commands are:

```text
npm run docs:parser
npm run docs:update
npm run docs:check
```

Use the check relevant to the change. When updating rendered API comments, inspect the generated output where formatting, links, or overloads might be affected. Reuse existing documentation tools for ordinary writing changes; propose tooling changes as separate work.

## Before submitting

Check technical statements against current code and tests; verify examples, names, and links; and confirm that valuable mathematical or usage explanations were not lost. Documentation edits should not change runtime behavior or broaden public APIs.
