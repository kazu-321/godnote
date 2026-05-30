import { Router } from "express";
import { getWorkspaceViewerHtml } from "../../src/shared/storage/viewerTemplate";
import { getWorkspaceViewerIndexHtml } from "../../src/shared/storage/viewerIndexTemplate";

export const templateRoutes = Router();

templateRoutes.get("/workspace-viewer-index", (_req, res) => {
  console.log("[godnote api] serve template workspace-viewer-index");
  res.type("html").send(getWorkspaceViewerIndexHtml());
});

templateRoutes.get("/workspace-viewer", (_req, res) => {
  console.log("[godnote api] serve template workspace-viewer");
  res.type("html").send(getWorkspaceViewerHtml());
});
