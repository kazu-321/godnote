import { Router } from "express";
import path from "node:path";
import { createWorkspaceAt, openWorkspaceAt } from "../services/workspaceInit.js";
import { getActiveWorkspace, isElectronManagedRuntime, setActiveDataRoot } from "../utils/paths.js";

export const workspaceRoutes = Router()
  .get("/", (_req, res) => {
    const active = getActiveWorkspace();
    if (active) {
      res.json(active);
      return;
    }
    if (isElectronManagedRuntime()) {
      res.json({ path: null, name: null });
      return;
    }
    const fallback = path.resolve(process.env.GODNOTE_DATA_ROOT ?? "sample_workspace");
    res.json({ path: fallback, name: path.basename(fallback) });
  })
  .put("/", async (req, res, next) => {
    try {
      const nextPath = String(req.body?.path ?? "").trim();
      if (!nextPath) {
        res.status(400).json({ error: "Workspace path is required." });
        return;
      }
      const root = await openWorkspaceAt(nextPath);
      setActiveDataRoot(root);
      res.json({ path: root, name: path.basename(root) });
    } catch (error) {
      next(error);
    }
  })
  .post("/create", async (req, res, next) => {
    try {
      const nextPath = String(req.body?.path ?? "").trim();
      if (!nextPath) {
        res.status(400).json({ error: "Workspace path is required." });
        return;
      }
      const root = await createWorkspaceAt(nextPath);
      setActiveDataRoot(root);
      res.json({ path: root, name: path.basename(root) });
    } catch (error) {
      next(error);
    }
  });
