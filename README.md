# proton-workspace

`proton-workspace` is a personal multi-product engineering workspace and monorepo control plane.

## Boundary

- Product repositories live under `repos/`.
- Each product remains an independent Git repository.
- A product may have its own package manager, lockfile, multi-package workspace, build, test, release, and publish strategy.
- The root workspace does not absorb product package graphs.
- Workspace-level orchestration must call commands formally exposed by each product repository.
- Product source under `repos/*/` is intentionally excluded from the `proton-workspace` Git repository.

## Current layout

```text
proton-workspace/
├── README.md
├── AGENTS.md
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── repos/
```

Platform instance state/config will be added later at:

```text
.<new-platform-name>/
```

after the new platform name is formally selected.
