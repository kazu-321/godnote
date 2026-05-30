import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const ONE_BY_ONE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+7ZcAAAAASUVORK5CYII=",
  "base64",
);

async function writeJson(filePath: string, value: unknown) {
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function setupWorkspace() {
  const root = await mkdtemp(join(tmpdir(), "godnote-server-"));
  const subjectId = "subject-a";
  const noteId = "note-a";
  const now = "2026-05-30T00:00:00.000Z";

  await writeJson(join(root, "manifest.json"), {
    schemaVersion: 1,
    appName: "godnote",
    appVersion: "0.1.0",
    subjectOrder: [subjectId],
    subjects: [{ id: subjectId, name: "数学", path: `subjects/${subjectId}.json` }],
  });
  await writeJson(join(root, "subjects", `${subjectId}.json`), {
    schemaVersion: 1,
    id: subjectId,
    name: "数学",
    description: "",
    createdAt: now,
    updatedAt: now,
    noteOrder: [noteId],
    notes: [{ id: noteId, title: "微分積分", metaPath: `notes/${subjectId}/${noteId}/meta.json`, notePath: `notes/${subjectId}/${noteId}/note.json` }],
  });
  await writeJson(join(root, "notes", subjectId, noteId, "meta.json"), {
    schemaVersion: 1,
    id: noteId,
    subjectId,
    title: "微分積分",
    description: "",
    createdAt: now,
    updatedAt: now,
    thumbnail: undefined,
  });
  await writeJson(join(root, "notes", subjectId, noteId, "note.json"), {
    schemaVersion: 1,
    id: noteId,
    subjectId,
    title: "微分積分",
    createdAt: now,
    updatedAt: now,
    canvas: {
      type: "infinite",
      viewport: { x: 0, y: 0, scale: 1 },
      grid: { mode: "free", snapStep: 10, gridSize: 100, visible: false },
      elements: [],
    },
  });
  await mkdir(join(root, "notes", subjectId, noteId, "assets", "images"), { recursive: true });
  await writeFile(join(root, "notes", subjectId, noteId, "assets", "images", "image.png"), ONE_BY_ONE_PNG);

  return { root, subjectId, noteId };
}

test("api routes serve health and workspace data", async () => {
  const { root, subjectId, noteId } = await setupWorkspace();
  const previousRoot = process.env.GODNOTE_DATA_ROOT;
  process.env.GODNOTE_DATA_ROOT = root;
  const { createApp } = await import("../server/app");

  const server = createServer(createApp());
  server.listen(0);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an ephemeral port");

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json() as Promise<{ ok: boolean }>);
    assert.deepEqual(health, { ok: true });

    const loadedManifest = await fetch(`${baseUrl}/api/manifest`).then((response) => response.json() as Promise<{ appName: string; subjectOrder: string[] }>);
    assert.equal(loadedManifest.appName, "godnote");
    assert.deepEqual(loadedManifest.subjectOrder.slice(0, 1), [subjectId]);

    const loadedSubject = await fetch(`${baseUrl}/api/subjects/${subjectId}`).then((response) => response.json() as Promise<{ id: string }>);
    assert.equal(loadedSubject.id, subjectId);

    const loadedNoteMeta = await fetch(`${baseUrl}/api/subjects/${subjectId}/notes/${noteId}/meta`).then((response) => response.json() as Promise<{ id: string }>);
    assert.equal(loadedNoteMeta.id, noteId);

    const loadedNote = await fetch(`${baseUrl}/api/subjects/${subjectId}/notes/${noteId}`).then((response) => response.json() as Promise<{ id: string; canvas: { type: string } }>);
    assert.equal(loadedNote.id, noteId);
    assert.equal(loadedNote.canvas.type, "infinite");

    const assetResponse = await fetch(`${baseUrl}/data/notes/${subjectId}/${noteId}/assets/images/image.png`);
    assert.equal(assetResponse.ok, true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousRoot === undefined) {
      delete process.env.GODNOTE_DATA_ROOT;
    } else {
      process.env.GODNOTE_DATA_ROOT = previousRoot;
    }
    await rm(root, { recursive: true, force: true });
  }
});
