import assert from "node:assert/strict";
import test from "node:test";
import { LocalApiStorageAdapter } from "../src/shared/storage/localApiStorageAdapter";
import { StaticReadonlyStorageAdapter } from "../src/shared/storage/staticReadonlyStorageAdapter";
import { getWorkspaceDeployWorkflowYaml } from "../src/shared/storage/workspaceStorageAdapter";

function withFetchStub<T>(impl: typeof fetch, run: () => Promise<T> | T) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(run()).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test("static readonly adapter reads JSON from the static data tree", async () => {
  const adapter = new StaticReadonlyStorageAdapter();
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const manifest = {
    schemaVersion: 1,
    appName: "godnote",
    appVersion: "0.1.0",
    subjectOrder: [],
    subjects: [],
  };

  await withFetchStub(
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      if (String(input).includes("/assets/images/")) {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      const payload =
        String(input) === "/api/subjects"
          ? {
              schemaVersion: 1,
              id: "subject-a",
              name: "数学",
              description: "",
              createdAt: "2026-05-30T00:00:00.000Z",
              updatedAt: "2026-05-30T00:00:00.000Z",
              noteOrder: [],
              notes: [],
            }
          : manifest;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
    async () => {
      const loadedManifest = await adapter.loadManifest();
      assert.deepEqual(loadedManifest, manifest);
      const loadedAsset = await adapter.loadAsset({ subjectId: "subject-a", noteId: "note-a", path: "assets/images/image.png" });
      assert.deepEqual([...loadedAsset], [1, 2, 3]);
    },
  );

  assert.equal(requests[0]?.url, "/data/manifest.json");
  assert.equal(requests[1]?.url, "/data/notes/subject-a/note-a/assets/images/image.png");
});

test("local api adapter issues the expected requests", async () => {
  const adapter = new LocalApiStorageAdapter();
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  await withFetchStub(
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      if (String(input).includes("/assets?path=")) {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      return new Response(JSON.stringify({ schemaVersion: 1, id: "subject-a", name: "数学", path: "subjects/subject-a.json" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
    async () => {
      await adapter.loadSubject("subject-a");
      const asset = await adapter.loadAsset({ subjectId: "subject-a", noteId: "note-a", path: "assets/images/image.png" });
      assert.deepEqual([...asset], [1, 2, 3]);
      await adapter.saveManifest({
        schemaVersion: 1,
        appName: "godnote",
        appVersion: "0.1.0",
        subjectOrder: [],
        subjects: [],
      });
      await adapter.createSubject({ name: "数学" });
    },
  );

  assert.equal(requests[0]?.url, "/api/subjects/subject-a");
  assert.equal(requests[0]?.init?.method, undefined);
  assert.equal(requests[1]?.url, "/api/subjects/subject-a/notes/note-a/assets?path=assets%2Fimages%2Fimage.png");
  assert.equal(requests[1]?.init?.method, undefined);
  assert.equal(requests[2]?.url, "/api/manifest");
  assert.equal(requests[2]?.init?.method, "PUT");
  assert.equal(requests[3]?.url, "/api/subjects");
  assert.equal(requests[3]?.init?.method, "POST");
});

test("readonly writes fail immediately", async () => {
  const adapter = new StaticReadonlyStorageAdapter();
  await assert.rejects(
    adapter.saveManifest({
      schemaVersion: 1,
      appName: "godnote",
      appVersion: "0.1.0",
      subjectOrder: [],
      subjects: [],
    }),
    /Readonly viewer does not allow writes/,
  );
});

test("readonly adapter rejects all write-oriented methods", async () => {
  const adapter = new StaticReadonlyStorageAdapter();
  const writeCalls: Array<Promise<unknown>> = [
    adapter.saveSubject({
      schemaVersion: 1,
      id: "subject-a",
      name: "数学",
      description: "",
      createdAt: "2026-05-30T00:00:00.000Z",
      updatedAt: "2026-05-30T00:00:00.000Z",
      noteOrder: [],
      notes: [],
    }),
    adapter.saveNoteMeta({
      schemaVersion: 1,
      id: "note-a",
      subjectId: "subject-a",
      title: "微分積分",
      description: "",
      createdAt: "2026-05-30T00:00:00.000Z",
      updatedAt: "2026-05-30T00:00:00.000Z",
      thumbnail: undefined,
    }),
    adapter.saveNote({
      schemaVersion: 1,
      id: "note-a",
      subjectId: "subject-a",
      title: "微分積分",
      createdAt: "2026-05-30T00:00:00.000Z",
      updatedAt: "2026-05-30T00:00:00.000Z",
      canvas: { type: "infinite", viewport: { x: 0, y: 0, scale: 1 }, grid: { mode: "free", snapStep: 10, gridSize: 100, visible: false }, elements: [] },
    }),
    adapter.createSubject({ name: "数学" }),
    adapter.deleteSubject("subject-a"),
    adapter.createNote({ subjectId: "subject-a", title: "微分積分" }),
    adapter.deleteNote("subject-a", "note-a"),
    adapter.writePngAsset({
      subjectId: "subject-a",
      noteId: "note-a",
      fileName: "image.png",
      bytes: new Uint8Array([1, 2, 3]),
    }),
    adapter.deleteAsset({ subjectId: "subject-a", noteId: "note-a", path: "assets/image.png" }),
    adapter.generateThumbnail({ subjectId: "subject-a", noteId: "note-a" }),
  ];

  await Promise.all(writeCalls.map((call) => assert.rejects(call, /Readonly viewer does not allow writes/)));
});

test("workspace Pages workflow is self-contained and does not use npm ci", () => {
  const workflow = getWorkspaceDeployWorkflowYaml();
  assert.match(workflow, /cp -R manifest\.json dist\/data\/manifest\.json/);
  assert.match(workflow, /cp -R subjects dist\/data\//);
  assert.match(workflow, /cp -R notes dist\/data\//);
  assert.match(workflow, /cp -R viewer\/index\.html dist\/index\.html/);
  assert.match(workflow, /cp -R viewer\/viewer\.html dist\/viewer\.html/);
  assert.doesNotMatch(workflow, /npm ci/);
});
