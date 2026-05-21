# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This is a single-context repo.

- Domain glossary: `docs/CONTEXT.md`
- Legacy/expanded glossary: `docs/GLOSSARY.md`
- ADRs: `docs/adr/`

## Use The Glossary Vocabulary

When output names a domain concept in an issue title, PRD, refactor proposal, hypothesis, or test name, use the term as defined in `docs/CONTEXT.md`.

If a needed concept is missing from the glossary, do not invent a competing term. Note the gap for a future `grill-with-docs` pass.

## Flag ADR Conflicts

Before proposing implementation in an area with existing ADRs, read relevant files in `docs/adr/`. If a proposal contradicts an ADR, surface that conflict explicitly rather than silently overriding it.
