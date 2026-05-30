import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = process.env.GODNOTE_PROJECT_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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

export const templateRoutes = Router();

templateRoutes.get("/workspace-viewer-index", async (_req, res, next) => {
  try {
    console.log("[godnote api] serve template workspace-viewer-index");
    res.type("html").send(await readTemplate("src/shared/storage/viewerIndexTemplate.ts", "export function getWorkspaceViewerIndexHtml()"));
  } catch (error) {
    next(error);
  }
});

templateRoutes.get("/workspace-viewer", async (_req, res, next) => {
  try {
    console.log("[godnote api] serve template workspace-viewer");
    res.type("html").send(await readTemplate("src/shared/storage/viewerTemplate.ts", "const VIEWER_HTML = `"));
  } catch (error) {
    next(error);
  }
});
