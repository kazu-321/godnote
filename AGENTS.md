# AGENTS.md

## Project

`godnote`

## What This Repo Is

`godnote` is a local-first note app built around a user-chosen workspace folder.

Current runtime targets:

1. Desktop editor
   - Always editable.
   - Starts on a Home screen with `ワークスペースを作成` and `ワークスペースを開く`.
   - Opens a workspace folder and reads/writes that workspace directly.
   - Remembers the last opened workspace as a convenience.

2. Static readonly viewer
   - Generated from a workspace into a static site.
   - Readonly only.
   - No workspace chooser UI.
   - Intended for GitHub Pages.

The repo uses the same frontend codebase for both targets, but there is no user-facing mode toggle anymore.

## Current Source Of Truth

- Editable data lives in the opened workspace root.
- The repository keeps only minimal sample workspace data for tests and validation.
- Repository sample data is intentionally minimal.
- `sample_workspace/manifest.json` is the only sample data kept in-repo right now.
- Sample subjects and sample notes should not be added back unless there is a strong reason.

## Current Direction

- Keep workspace creation and workspace opening as separate actions.
- Keep Git management manual for now.
- The app may generate a GitHub Pages workflow inside a workspace.
- The next big step is Electron packaging.
- The eventual packaged app should produce OS-specific builds, not one cross-OS binary.

## Important Rules

- Do not reintroduce an old split between editor data and viewer data.
- Do not reintroduce the old user-facing app mode toggle.
- Keep sample data to the minimum needed for tests and validation.
- Keep the workspace flow simple and safe.
- Save failures must remain visible in the UI.
- Desktop editing is the main target.
- The static viewer must stay readonly.

## Data Layout

Workspace data shape:

```txt
<workspace>/
├── manifest.json
├── subjects/
└── notes/
```

The workspace may also contain:

```txt
<workspace>/.github/workflows/deploy-pages.yml
```

The static viewer is generated from workspace data into `dist/data/` during build.

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
  - readonly viewer reads
  - recent workspace persistence

- `server/`
  - local API server for workspace-backed writes
  - path helpers and JSON write utilities

- `workspaceStorageAdapter`
  - workspace initialization
  - workflow generation
  - file-system access through the browser File System Access API

## Validation

Use these checks when changing app behavior:

- `npm run typecheck`
- `npm test`
- `npm run build`

For data-shape changes, also keep `sample_workspace/manifest.json` and the tests in sync.

## Near-Term Roadmap

1. Finish the desktop workspace flow.
2. Keep the repo sample data minimal.
3. Rename the repository cleanly when the new project name is finalized.
4. Move the desktop app to Electron.
5. Separate desktop packaging from the generated readonly viewer.

## Notes For Future Work

- Treat old repository-name references as dead history.
- Treat the old repository layout as dead history.
- If a future change needs more sample content, add only the minimum required for tests.
