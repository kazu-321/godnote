import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonFile } from "../utils/json.js";

const DEFAULT_APP_NAME = "godnote";
const DEFAULT_APP_VERSION = "0.1.0";
const DEFAULT_SCHEMA_VERSION = 1;
const ALLOWED_NON_WORKSPACE_ENTRIES = new Set([".git", ".gitignore", ".DS_Store", "Thumbs.db"]);

const projectRoot = process.env.GODNOTE_PROJECT_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function defaultManifest() {
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    appName: DEFAULT_APP_NAME,
    appVersion: DEFAULT_APP_VERSION,
    subjectOrder: [] as string[],
    subjects: [] as Array<{ id: string; name: string; path: string }>,
  };
}

function getWorkspaceDeployWorkflowYaml() {
  return [
    "name: Deploy godnote viewer",
    "# godnote workspace template v2",
    "",
    "on:",
    "  push:",
    "    branches: [main]",
    "  workflow_dispatch:",
    "",
    "permissions:",
    "  contents: read",
    "  pages: write",
    "  id-token: write",
    "",
    "concurrency:",
    "  group: pages",
    "  cancel-in-progress: true",
    "",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Checkout",
    "        uses: actions/checkout@v4",
    "      - name: Prepare viewer",
    "        run: |",
    "          rm -rf dist",
    "          mkdir -p dist/data",
    "          cp -R manifest.json dist/data/manifest.json",
    "          cp -R subjects dist/data/",
    "          cp -R notes dist/data/",
    "          cp -R viewer/index.html dist/index.html",
    "          cp -R viewer/viewer.html dist/viewer.html",
    "      - name: Upload Pages artifact",
    "        uses: actions/upload-pages-artifact@v3",
    "        with:",
    "          path: dist",
    "",
    "  deploy:",
    "    needs: build",
    "    runs-on: ubuntu-latest",
    "    environment:",
    "      name: github-pages",
    "      url: ${{ steps.deployment.outputs.page_url }}",
    "    steps:",
    "      - name: Deploy to GitHub Pages",
    "        id: deployment",
    "        uses: actions/deploy-pages@v4",
    "",
  ].join("\n");
}

async function readTemplate(relativePath: string, marker: string) {
  const filePath = path.join(projectRoot, relativePath);
  const source = await readFile(filePath, "utf8");
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Template marker not found: ${relativePath}`);
  }
  const start = source.indexOf("`", markerIndex);
  const end = source.lastIndexOf("`");
  if (start < 0 || end <= start) {
    throw new Error(`Template literal not found: ${relativePath}`);
  }
  return source.slice(start + 1, end);
}

async function entryExists(root: string, relativePath: string) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function hasUnsafeEntries(root: string) {
  const entries = await readdir(root);
  return entries.some((name) => !ALLOWED_NON_WORKSPACE_ENTRIES.has(name));
}

async function ensureWorkspaceFolders(root: string) {
  await mkdir(path.join(root, "subjects"), { recursive: true });
  await mkdir(path.join(root, "notes"), { recursive: true });
  await mkdir(path.join(root, "viewer"), { recursive: true });
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
}

async function writeTextIfChanged(root: string, relativePath: string, nextText: string) {
  const filePath = path.join(root, relativePath);
  let previousText: string | null = null;
  try {
    previousText = await readFile(filePath, "utf8");
  } catch {
    previousText = null;
  }
  if (previousText === nextText) return false;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, nextText, "utf8");
  return true;
}

async function ensureViewerFiles(root: string) {
  await writeTextIfChanged(root, "viewer/index.html", `${await readTemplate("src/shared/storage/viewerIndexTemplate.ts", "export function getWorkspaceViewerIndexHtml()")}\n`);
  await writeTextIfChanged(root, "viewer/viewer.html", `${await readTemplate("src/shared/storage/viewerTemplate.ts", "const VIEWER_HTML = `")}\n`);
}

async function ensureWorkflowFile(root: string) {
  await writeTextIfChanged(root, ".github/workflows/deploy-pages.yml", `${getWorkspaceDeployWorkflowYaml()}\n`);
}

async function ensureWorkspaceShape(root: string, options: { createIfMissing: boolean }) {
  const manifestExists = await entryExists(root, "manifest.json");
  if (!manifestExists && !options.createIfMissing) {
    throw new Error("This folder does not look like a godnote workspace.");
  }
  if (!manifestExists && options.createIfMissing && (await hasUnsafeEntries(root))) {
    throw new Error("Choose an empty folder or a folder with only git metadata for workspace creation.");
  }
  await ensureWorkspaceFolders(root);
  if (!manifestExists) {
    await writeJsonFile(path.join(root, "manifest.json"), defaultManifest());
  }
  await ensureViewerFiles(root);
  await ensureWorkflowFile(root);
}

export async function openWorkspaceAt(rootPath: string) {
  const root = path.resolve(rootPath);
  await access(root);
  await ensureWorkspaceShape(root, { createIfMissing: false });
  return root;
}

export async function createWorkspaceAt(rootPath: string) {
  const root = path.resolve(rootPath);
  await access(root);
  if (await entryExists(root, "manifest.json")) {
    throw new Error("This folder already contains a godnote workspace. Use Open instead.");
  }
  if (await hasUnsafeEntries(root)) {
    throw new Error("Choose an empty folder or a folder with only git metadata for workspace creation.");
  }
  await ensureWorkspaceShape(root, { createIfMissing: true });
  return root;
}
