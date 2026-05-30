import type { AppManifest } from "../../features/notes/model/manifestTypes";
import type { SubjectData } from "../../features/notes/model/subjectTypes";
import type {
  AssetRef,
  CreateNoteInput,
  CreateSubjectInput,
  DeleteAssetInput,
  GenerateThumbnailInput,
  LoadAssetInput,
  NoteData,
  NoteMeta,
  WritePngAssetInput,
} from "../../features/notes/model/noteTypes";
import { manifestSchema, noteMetaSchema, noteSchema, subjectSchema } from "../../features/notes/model/noteSchemas";
import type { StorageAdapter } from "./storageAdapter";

const DEFAULT_APP_NAME = "godnote";
const DEFAULT_APP_VERSION = "0.1.0";
const DEFAULT_SCHEMA_VERSION = 1;
const PLACEHOLDER_THUMBNAIL_PATH = "assets/thumbnails/thumbnail.png";
const PLACEHOLDER_THUMBNAIL_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+7ZcAAAAASUVORK5CYII=";

function workspaceReadonlyError(message: string) {
  return new Error(message);
}

function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

async function ensureReadWritePermission(handle: FileSystemDirectoryHandle) {
  const accessHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  };
  const permission = await accessHandle.queryPermission?.({ mode: "readwrite" });
  if (permission === "granted") return;
  const requested = await accessHandle.requestPermission?.({ mode: "readwrite" });
  if (requested !== "granted") {
    throw workspaceReadonlyError("Workspace permission was not granted.");
  }
}

async function getDirectoryHandle(root: FileSystemDirectoryHandle, parts: string[], create: boolean) {
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function getFileHandle(root: FileSystemDirectoryHandle, parts: string[], create: boolean) {
  if (parts.length === 0) throw new Error("File path is empty.");
  const directory = await getDirectoryHandle(root, parts.slice(0, -1), create);
  return directory.getFileHandle(parts[parts.length - 1], { create });
}

async function readJson<T>(root: FileSystemDirectoryHandle, path: string) {
  const fileHandle = await getFileHandle(root, splitPath(path), false);
  const file = await fileHandle.getFile();
  const text = await file.text();
  return JSON.parse(text) as T;
}

async function writeJson(root: FileSystemDirectoryHandle, path: string, value: unknown) {
  const fileHandle = await getFileHandle(root, splitPath(path), true);
  const writable = await fileHandle.createWritable();
  await writable.write(`${JSON.stringify(value, null, 2)}\n`);
  await writable.close();
}

async function writeBytes(root: FileSystemDirectoryHandle, path: string, bytes: Uint8Array) {
  const fileHandle = await getFileHandle(root, splitPath(path), true);
  const writable = await fileHandle.createWritable();
  await writable.write(bytes as unknown as BlobPart);
  await writable.close();
}

async function readBytes(root: FileSystemDirectoryHandle, path: string) {
  const fileHandle = await getFileHandle(root, splitPath(path), false);
  const file = await fileHandle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

async function removeEntry(root: FileSystemDirectoryHandle, path: string) {
  const parts = splitPath(path);
  if (parts.length === 0) return;
  const directory = await getDirectoryHandle(root, parts.slice(0, -1), false);
  await directory.removeEntry(parts[parts.length - 1], { recursive: true });
}

async function entryExists(root: FileSystemDirectoryHandle, path: string) {
  try {
    const parts = splitPath(path);
    if (parts.length === 0) return false;
    const directory = await getDirectoryHandle(root, parts.slice(0, -1), false);
    await directory.getFileHandle(parts[parts.length - 1], { create: false });
    return true;
  } catch {
    return false;
  }
}

async function hasUnsafeEntries(root: FileSystemDirectoryHandle) {
  const allowed = new Set([".git", ".gitignore", ".DS_Store", "Thumbs.db"]);
  for await (const [name] of (root as FileSystemDirectoryHandle & { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries()) {
    if (!allowed.has(name)) return true;
  }
  return false;
}

function decodeBase64(base64: string) {
  if (typeof atob === "function") {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function ensureWorkspaceFolders(root: FileSystemDirectoryHandle) {
  await getDirectoryHandle(root, ["subjects"], true);
  await getDirectoryHandle(root, ["notes"], true);
  await getDirectoryHandle(root, [".github", "workflows"], true);
}

function defaultManifest(): AppManifest {
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    appName: DEFAULT_APP_NAME,
    appVersion: DEFAULT_APP_VERSION,
    subjectOrder: [],
    subjects: [],
  };
}

export function getWorkspaceDeployWorkflowYaml() {
  return [
    "name: Deploy godnote viewer",
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
        "          cat > dist/index.html <<'HTML'",
        "<!doctype html>",
        "<html lang=\"ja\">",
        "  <head>",
        "    <meta charset=\"UTF-8\" />",
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
        "    <title>godnote viewer</title>",
        "    <style>",
        "      :root { color-scheme: light; }",
        "      body { margin: 0; font-family: system-ui, sans-serif; background: #f5efe6; color: #2b241c; }",
        "      main { width: min(1100px, calc(100vw - 32px)); margin: 0 auto; padding: 32px 0 80px; }",
        "      .hero, .card { background: rgba(255, 250, 242, 0.92); border: 1px solid rgba(62, 45, 28, 0.12); border-radius: 20px; box-shadow: 0 20px 60px rgba(60, 39, 17, 0.1); }",
        "      .hero { padding: 28px; margin-bottom: 24px; }",
        "      .hero h1 { margin: 0; font-size: clamp(2rem, 6vw, 4rem); line-height: 1.05; }",
        "      .lead { color: #6f5d48; line-height: 1.8; }",
        "      .grid { display: grid; gap: 20px; grid-template-columns: 320px 1fr; }",
        "      .card { padding: 20px; }",
        "      .list { display: grid; gap: 8px; }",
        "      button { width: 100%; text-align: left; border: 1px solid rgba(62, 45, 28, 0.12); border-radius: 14px; padding: 12px 14px; background: white; font: inherit; cursor: pointer; }",
        "      button:hover { border-color: #9a5b2f; }",
        "      .meta { color: #6f5d48; font-size: 0.94rem; }",
        "      .note-content img { max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 12px; }",
        "      .note-content pre { white-space: pre-wrap; }",
        "      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }",
        "    </style>",
        "  </head>",
        "  <body>",
        "    <main>",
        "      <section class=\"hero\">",
        "        <p class=\"meta\">godnote viewer</p>",
        "        <h1>workspace から生成される readonly viewer</h1>",
        "        <p class=\"lead\">このページは workspace の manifest / subjects / notes をそのまま読み込み、GitHub Pages に公開するための静的ビューアです。</p>",
        "      </section>",
        "      <section class=\"grid\">",
        "        <aside class=\"card\">",
        "          <h2>Subjects</h2>",
        "          <div id=\"subjects\" class=\"list\"></div>",
        "        </aside>",
        "        <section class=\"card\">",
        "          <h2 id=\"note-title\">Note</h2>",
        "          <div id=\"note-meta\" class=\"meta\"></div>",
        "          <div id=\"note-content\" class=\"note-content\"></div>",
        "        </section>",
        "      </section>",
        "    </main>",
        "    <script>",
        "      const dataRoot = './data';",
        "      const subjectsEl = document.getElementById('subjects');",
        "      const noteTitleEl = document.getElementById('note-title');",
        "      const noteMetaEl = document.getElementById('note-meta');",
        "      const noteContentEl = document.getElementById('note-content');",
        "      const escapeHtml = (value) => String(value).replace(/[&<>\\\"]/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\\\"':'&quot;'}[ch]));",
        "      const readJson = async (path) => fetch(path).then((response) => { if (!response.ok) throw new Error(path + ' ' + response.status); return response.json(); });",
        "      const noteCache = new Map();",
        "      async function loadNote(subjectId, noteId) {",
        "        const key = subjectId + ':' + noteId;",
        "        if (!noteCache.has(key)) noteCache.set(key, readJson(`${dataRoot}/notes/${subjectId}/${noteId}/note.json`));",
        "        return noteCache.get(key);",
        "      }",
        "      function renderNote(note, subjectName) {",
        "        noteTitleEl.textContent = note.title || 'Note';",
        "        noteMetaEl.textContent = `${subjectName} / ${note.title || note.id}`;",
        "        const elements = [...(note.canvas?.elements ?? [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));",
        "        noteContentEl.innerHTML = elements.map((element) => {",
        "          if (element.type === 'text') {",
        "            return `<section><h3>Text</h3><pre>${escapeHtml(element.content)}</pre></section>`;",
        "          }",
        "          if (element.type === 'image') {",
        "            const src = `${dataRoot}/notes/${note.subjectId}/${note.id}/${element.src}`;",
        "            return `<section><h3>Image</h3><img src=\"${src}\" alt=\"${escapeHtml(element.originalFileName || element.id)}\" loading=\"lazy\" /></section>`;",
        "          }",
        "          return `<section><h3>${escapeHtml(element.type)}</h3><pre>${escapeHtml(JSON.stringify(element, null, 2))}</pre></section>`;",
        "        }).join('') || '<p class=\"meta\">No elements</p>';",
        "      }",
        "      async function bootstrap() {",
        "        const manifest = await readJson(`${dataRoot}/manifest.json`);",
        "        const subjects = manifest.subjects ?? [];",
        "        subjectsEl.innerHTML = '';",
        "        for (const subject of subjects) {",
        "          const subjectData = await readJson(`${dataRoot}/${subject.path}`);",
        "          const button = document.createElement('button');",
        "          button.type = 'button';",
        "          button.innerHTML = `<strong>${escapeHtml(subject.name)}</strong><div class=\"meta\">${subjectData.noteOrder.length} notes</div>`;",
        "          button.addEventListener('click', async () => {",
        "            const noteId = subjectData.noteOrder[0] || subjectData.notes[0]?.id;",
        "            if (!noteId) {",
        "              noteTitleEl.textContent = subject.name;",
        "              noteMetaEl.textContent = 'No notes in this subject.';",
        "              noteContentEl.innerHTML = '<p class=\"meta\">No notes</p>';",
        "              return;",
        "            }",
        "            const note = await loadNote(subject.id, noteId);",
        "            renderNote(note, subject.name);",
        "          });",
        "          subjectsEl.appendChild(button);",
        "        }",
        "        const first = subjects[0];",
        "        if (first) {",
        "          const subjectData = await readJson(`${dataRoot}/${first.path}`);",
        "          const noteId = subjectData.noteOrder[0] || subjectData.notes[0]?.id;",
        "          if (noteId) renderNote(await loadNote(first.id, noteId), first.name);",
        "          else { noteTitleEl.textContent = first.name; noteMetaEl.textContent = 'No notes in this subject.'; noteContentEl.innerHTML = '<p class=\"meta\">No notes</p>'; }",
        "        }",
        "      }",
        "      bootstrap().catch((error) => {",
        "        noteTitleEl.textContent = 'Failed to load';",
        "        noteMetaEl.textContent = String(error);",
        "        noteContentEl.innerHTML = '<p class=\"meta\">Check the console for details.</p>';",
        "      });",
        "    </script>",
        "  </body>",
        "</html>",
        "HTML",
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

async function ensureWorkflowFile(root: FileSystemDirectoryHandle) {
  const workflowHandle = await getFileHandle(root, [".github", "workflows", "deploy-pages.yml"], true);
  const writable = await workflowHandle.createWritable();
  await writable.write(`${getWorkspaceDeployWorkflowYaml()}\n`);
  await writable.close();
}

async function ensureWorkspaceShape(root: FileSystemDirectoryHandle, options: { createIfMissing: boolean }) {
  await ensureReadWritePermission(root);
  const manifestExists = await entryExists(root, "manifest.json");
  if (!manifestExists && !options.createIfMissing) {
    throw new Error("This folder does not look like a godnote workspace.");
  }
  if (!manifestExists && options.createIfMissing && (await hasUnsafeEntries(root))) {
    throw new Error("Choose an empty folder or a folder with only git metadata for workspace creation.");
  }
  await ensureWorkspaceFolders(root);
  if (!manifestExists) {
    await writeJson(root, "manifest.json", defaultManifest());
  }
  await ensureWorkflowFile(root);
}

function assetFileName(fileName?: string) {
  const base = (fileName && fileName.trim() ? fileName : `${crypto.randomUUID()}.png`).split("/").pop() ?? `${crypto.randomUUID()}.png`;
  return base.toLowerCase().endsWith(".png") ? base : `${base}.png`;
}

export class WorkspaceStorageAdapter implements StorageAdapter {
  constructor(private readonly root: FileSystemDirectoryHandle) {}

  async loadManifest() {
    return manifestSchema.parse(await readJson<AppManifest>(this.root, "manifest.json"));
  }

  async saveManifest(manifest: AppManifest) {
    manifestSchema.parse(manifest);
    await writeJson(this.root, "manifest.json", manifest);
  }

  async loadSubject(subjectId: string) {
    return subjectSchema.parse(await readJson<SubjectData>(this.root, `subjects/${subjectId}.json`));
  }

  async saveSubject(subject: SubjectData) {
    subjectSchema.parse(subject);
    await writeJson(this.root, `subjects/${subject.id}.json`, subject);
  }

  async loadNoteMeta(subjectId: string, noteId: string) {
    return noteMetaSchema.parse(await readJson<NoteMeta>(this.root, `notes/${subjectId}/${noteId}/meta.json`));
  }

  async saveNoteMeta(meta: NoteMeta) {
    noteMetaSchema.parse(meta);
    await writeJson(this.root, `notes/${meta.subjectId}/${meta.id}/meta.json`, meta);
  }

  async loadNote(subjectId: string, noteId: string) {
    return noteSchema.parse(await readJson<NoteData>(this.root, `notes/${subjectId}/${noteId}/note.json`));
  }

  async saveNote(note: NoteData) {
    noteSchema.parse(note);
    await writeJson(this.root, `notes/${note.subjectId}/${note.id}/note.json`, note);
  }

  async createSubject(input: CreateSubjectInput) {
    const now = new Date().toISOString();
    const subjectId = crypto.randomUUID();
    const subject: SubjectData = {
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      id: subjectId,
      name: input.name,
      description: "",
      createdAt: now,
      updatedAt: now,
      noteOrder: [],
      notes: [],
    };
    const manifest = await this.loadManifest();
    manifest.subjectOrder.push(subjectId);
    manifest.subjects.push({ id: subjectId, name: input.name, path: `subjects/${subjectId}.json` });
    await this.saveManifest(manifest);
    await this.saveSubject(subject);
    return subject;
  }

  async deleteSubject(subjectId: string) {
    const subject = await this.loadSubject(subjectId);
    if (subject.notes.length > 0) {
      throw new Error("Subject is not empty.");
    }
    const manifest = await this.loadManifest();
    manifest.subjectOrder = manifest.subjectOrder.filter((id) => id !== subjectId);
    manifest.subjects = manifest.subjects.filter((subjectItem) => subjectItem.id !== subjectId);
    await this.saveManifest(manifest);
    await removeEntry(this.root, `subjects/${subjectId}.json`);
  }

  async createNote(input: CreateNoteInput) {
    const now = new Date().toISOString();
    const noteId = crypto.randomUUID();
    const meta: NoteMeta = {
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      id: noteId,
      subjectId: input.subjectId,
      title: input.title,
      description: "",
      createdAt: now,
      updatedAt: now,
      thumbnail: undefined,
    };
    const note: NoteData = {
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      id: noteId,
      subjectId: input.subjectId,
      title: input.title,
      createdAt: now,
      updatedAt: now,
      canvas: {
        type: "infinite",
        viewport: { x: 0, y: 0, scale: 1 },
        grid: { mode: "free", snapStep: 10, gridSize: 100, visible: false },
        elements: [],
      },
    };
    const subject = await this.loadSubject(input.subjectId);
    subject.noteOrder.push(noteId);
    subject.notes.push({
      id: noteId,
      title: input.title,
      metaPath: `notes/${input.subjectId}/${noteId}/meta.json`,
      notePath: `notes/${input.subjectId}/${noteId}/note.json`,
    });
    subject.updatedAt = now;
    await this.saveSubject(subject);
    await writeJson(this.root, `notes/${input.subjectId}/${noteId}/meta.json`, meta);
    await writeJson(this.root, `notes/${input.subjectId}/${noteId}/note.json`, note);
    return note;
  }

  async deleteNote(subjectId: string, noteId: string) {
    const subject = await this.loadSubject(subjectId);
    subject.noteOrder = subject.noteOrder.filter((id) => id !== noteId);
    subject.notes = subject.notes.filter((note) => note.id !== noteId);
    subject.updatedAt = new Date().toISOString();
    await this.saveSubject(subject);
    await removeEntry(this.root, `notes/${subjectId}/${noteId}`);
  }

  async loadAsset(input: LoadAssetInput) {
    return readBytes(this.root, `notes/${input.subjectId}/${input.noteId}/${input.path}`);
  }

  async writePngAsset(input: WritePngAssetInput) {
    const fileName = assetFileName(input.fileName);
    const assetPath = `assets/images/${fileName}`;
    await writeBytes(this.root, `notes/${input.subjectId}/${input.noteId}/${assetPath}`, input.bytes);
    return { path: assetPath } satisfies AssetRef;
  }

  async deleteAsset(input: DeleteAssetInput) {
    await removeEntry(this.root, `notes/${input.subjectId}/${input.noteId}/${input.path}`);
  }

  async generateThumbnail(input: GenerateThumbnailInput) {
    const thumbnailPath = `notes/${input.subjectId}/${input.noteId}/${PLACEHOLDER_THUMBNAIL_PATH}`;
    await writeBytes(this.root, thumbnailPath, decodeBase64(PLACEHOLDER_THUMBNAIL_BASE64));
    return { path: PLACEHOLDER_THUMBNAIL_PATH };
  }
}

export async function createWorkspaceStorageAdapter(root: FileSystemDirectoryHandle) {
  await ensureReadWritePermission(root);
  if (await entryExists(root, "manifest.json")) {
    throw new Error("This folder already contains a godnote workspace. Use Open instead.");
  }
  if (await hasUnsafeEntries(root)) {
    throw new Error("Choose an empty folder or a folder with only git metadata for workspace creation.");
  }
  await ensureWorkspaceShape(root, { createIfMissing: true });
  return new WorkspaceStorageAdapter(root);
}

export async function openWorkspaceStorageAdapter(root: FileSystemDirectoryHandle) {
  await ensureWorkspaceShape(root, { createIfMissing: false });
  return new WorkspaceStorageAdapter(root);
}
