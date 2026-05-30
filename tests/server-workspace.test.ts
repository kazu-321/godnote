import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function writeJson(filePath: string, value: unknown) {
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

test("workspace routes bind and create electron workspaces", async () => {
  const previousRoot = process.env.GODNOTE_DATA_ROOT;
  const previousElectron = process.env.GODNOTE_ELECTRON;
  delete process.env.GODNOTE_DATA_ROOT;
  process.env.GODNOTE_ELECTRON = "1";

  const existingRoot = await mkdtemp(join(tmpdir(), "godnote-workspace-open-"));
  await writeJson(join(existingRoot, "manifest.json"), {
    schemaVersion: 1,
    appName: "godnote",
    appVersion: "0.1.0",
    subjectOrder: [],
    subjects: [],
  });

  const createRoot = await mkdtemp(join(tmpdir(), "godnote-workspace-create-"));
  const { createApp } = await import("../server/app");
  const server = createServer(createApp());
  server.listen(0);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an ephemeral port");

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const empty = await fetch(`${baseUrl}/api/workspace`).then((response) => response.json() as Promise<{ path: string | null; name: string | null }>);
    assert.deepEqual(empty, { path: null, name: null });

    const opened = await fetch(`${baseUrl}/api/workspace`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: existingRoot }),
    }).then((response) => response.json() as Promise<{ path: string; name: string }>);
    assert.equal(opened.path, existingRoot);
    assert.equal(opened.name, existingRoot.split("/").pop());

    const manifest = await fetch(`${baseUrl}/api/manifest`).then((response) => response.json() as Promise<{ appName: string }>);
    assert.equal(manifest.appName, "godnote");

    const created = await fetch(`${baseUrl}/api/workspace/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: createRoot }),
    }).then((response) => response.json() as Promise<{ path: string; name: string }>);
    assert.equal(created.path, createRoot);
    assert.equal(created.name, createRoot.split("/").pop());
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (previousRoot === undefined) {
      delete process.env.GODNOTE_DATA_ROOT;
    } else {
      process.env.GODNOTE_DATA_ROOT = previousRoot;
    }
    if (previousElectron === undefined) {
      delete process.env.GODNOTE_ELECTRON;
    } else {
      process.env.GODNOTE_ELECTRON = previousElectron;
    }
    await rm(existingRoot, { recursive: true, force: true });
    await rm(createRoot, { recursive: true, force: true });
  }
});
