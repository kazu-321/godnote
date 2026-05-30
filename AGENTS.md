# AGENTS.md

## Project

`godnote`

## What This Repo Is

`godnote` is a local-first note app with a workspace-based data model.

Current runtime targets:

1. Desktop editor
   - Always editable.
   - Starts on a Home screen with `ワークスペースを作成` and `ワークスペースを開く`.
   - Opens a workspace folder and reads/writes that workspace directly.
   - Remembers the last opened workspace as a convenience.

2. GitHub Pages documentation site
   - Static site built from `docs/`.
   - Explains what the app is and how to use it.
   - Does not run the app itself.
   - Does not expose workspace editing UI.

The same frontend codebase is still used for the desktop editor. GitHub Pages is now documentation only.

## Current Source Of Truth

- Editable data lives in the opened workspace root.
- The repository keeps only minimal sample workspace data for tests and validation.
- `sample_workspace/manifest.json` is the only sample data kept in-repo right now.
- Sample subjects and sample notes should not be added back unless there is a strong reason.

## Current Direction

- Keep workspace creation and workspace opening as separate actions.
- Keep Git management manual for now.
- The app may generate a GitHub Pages workflow inside a workspace.
- GitHub Pages for this repo should stay a documentation site.
- The next big step is Electron packaging.
- Ubuntu desktop packaging should use `.deb` first.
- `npm run release` should build both `.deb` and `AppImage`.
- Deb builds should carry a unique build version so repeated installs upgrade cleanly.
- The eventual packaged app should produce OS-specific builds, not one cross-OS binary.

## Important Rules

- Do not reintroduce the old `public/data` repository layout.
- Do not reintroduce the old user-facing app mode toggle.
- Keep sample data to the minimum needed for tests and validation.
- Keep the workspace flow simple and safe.
- Save failures must remain visible in the UI.
- Desktop editing is the main target.
- GitHub Pages must stay docs-only.

## Data Layout

Workspace data shape:

```txt
<workspace>/
├── manifest.json
├── subjects/
├── notes/
└── .github/workflows/deploy-pages.yml
```

## Code Areas To Know

- `src/App.tsx`
  - boot flow
  - Home screen
  - workspace restore
  - routing between Home and note editor

- `src/pages/WorkspaceLauncherPage/`
  - create workspace
  - open workspace
  - reopen last workspace

- `src/pages/NoteEditorPage/`
  - editor UI
  - note/subject loading
  - canvas editing

- `src/shared/storage/`
  - storage adapters
  - workspace persistence
  - recent workspace persistence

- `server/`
  - local API server for workspace-backed writes
  - path helpers and JSON write utilities

- `src/shared/storage/workspaceStorageAdapter.ts`
  - workspace initialization
  - workflow generation
  - file-system access through the browser File System Access API

## Validation

Use these checks when changing app behavior:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run build:docs`
- `npm run release`
- `npm run deb`

For data-shape changes, keep `sample_workspace/manifest.json` and the tests in sync.

## Near-Term Roadmap

1. Finish the desktop workspace flow.
2. Keep sample data minimal.
3. Rename the repository cleanly when the project name is finalized.
4. Finish the Electron desktop packaging flow.
5. Keep GitHub Pages as documentation only.

## Notes For Future Work

- Treat old repository-name references as dead history.
- Treat the old repository layout as dead history.
- If a future change needs more sample content, add only the minimum required for tests.
