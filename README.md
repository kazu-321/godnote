# godnote

Local-first note app with a workspace-based data model.

## What this repo contains

- Desktop editor for working inside a user-chosen workspace folder
- Local API server for workspace-backed file writes
- Static GitHub Pages documentation site built from `docs/`
- Minimal sample workspace data for tests

## GitHub Pages

GitHub Pages for this repo is a documentation site, not the app itself.

It explains:

- what `godnote` is
- how to create or open a workspace
- how the workspace layout works
- what the next steps are

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
npm run build:docs
```

## Desktop Packaging

Ubuntu 24 では `npm run release` で `.deb` と `AppImage` をまとめて作るのが基本です。

```bash
npm run release
```

Build output:

- `release/*.AppImage`
- `release/*.deb`

Install example:

```bash
sudo dpkg -i release/*.deb
```

If dependencies are missing:

```bash
sudo apt -f install
```

The desktop app keeps the last opened workspace inside its own local browser storage, so the packaged app should be launched on the same machine user profile each time.

Each `.deb` build gets a timestamped package version, so reinstalling a newly built package with the same filename pattern should upgrade cleanly.

## Scripts

- `npm run dev` - frontend dev server
- `npm run server` - local API server
- `npm run build` - web app production build
- `npm run release` - build `.deb` and `AppImage`
- `npm run deb` - Ubuntu desktop package build
- `npm run appimage` - Ubuntu AppImage build
- `npm run build:docs` - GitHub Pages docs build
- `npm run typecheck` - TypeScript check
- `npm test` - unit tests
- `npm run validate:data` - validate sample workspace data
- `npm run check:assets` - validate asset layout

## Next steps

1. Finish the desktop workspace flow.
2. Keep sample data minimal.
3. Rename the repository cleanly when the project name is finalized.
4. Finish the Electron desktop packaging flow.
5. Keep GitHub Pages docs-only.
