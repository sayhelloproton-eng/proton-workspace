# AGENTS.md

## Workspace role

This repository is the personal multi-product engineering workspace `proton-workspace`.

## Hard boundaries

1. Treat `proton-workspace` as the workspace/control plane for multiple products.
2. Product repositories live under `repos/<product>/` and remain independent Git repositories.
3. Never absorb `repos/**` into the root pnpm workspace or root lockfile.
4. Never create cross-repository `workspace:`, relative package, or link dependencies between the root workspace and products.
5. Workspace orchestration may invoke a product's own documented `test`, `build`, `release`, `publish`, or equivalent commands, but must not take ownership of that product's internal package graph.
6. Do not commit product source from `repos/**` into this repository.
7. `repos/ai-agent-platform/`, when present, is legacy/reference-only unless an explicit task says otherwise.
8. Do not invent a final new-platform name or platform instance directory before that naming decision is frozen.
9. Keep the workspace root minimal. Do not pre-create `artifacts/`, `config/`, `docs/`, `scripts/`, `tools/`, `tmp/`, or similar directories without a real requirement.
10. Prefer Node.js built-in capabilities and already-frozen workspace tooling over adding dependencies without evidence.

## Runtime baseline

- Node.js: `24.19.0`
- Package manager: `pnpm@11.21.0`
- Module system: ESM
