# godnote

Local-first note app with a workspace-based data model and a generated static readonly viewer.

## Current state

- Desktop editor is the main target.
- The editor starts on a Home screen with workspace creation and opening.
- The app reads and writes the selected workspace directly.
- The readonly viewer is generated from workspace data and is intended for GitHub Pages.
- Repository sample data is intentionally minimal.

## Workspace layout

```txt
<workspace>/
├── manifest.json
├── subjects/
├── notes/
└── .github/workflows/deploy-pages.yml
```

## Development

```bash
npm run typecheck
npm test
npm run build
```

## Scripts

- `npm run dev` - frontend dev server
- `npm run server` - local API server
- `npm run build` - production build
- `npm run typecheck` - TypeScript check
- `npm test` - unit tests
- `npm run validate:data` - validate sample workspace data
- `npm run check:assets` - validate asset layout

## Next steps

1. Finish the desktop workspace flow.
2. Keep sample data minimal.
3. Rename the repository cleanly when the project name is finalized.
4. Move the desktop app to Electron.
5. Keep the readonly viewer as a generated static build.
