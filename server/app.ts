import express from "express";
import path from "node:path";
import { dataRoot } from "./utils/paths.js";
import { manifestRoutes } from "./routes/manifestRoutes.js";
import { subjectRoutes } from "./routes/subjectRoutes.js";
import { noteRoutes } from "./routes/noteRoutes.js";
import { assetRoutes } from "./routes/assetRoutes.js";
import { templateRoutes } from "./routes/templateRoutes.js";
import { workspaceRoutes } from "./routes/workspaceRoutes.js";

export function createApp(options: { staticRoot?: string } = {}) {
  const app = express();
  app.use(express.json({ limit: "20mb" }));
  if (options.staticRoot) {
    app.use(express.static(path.resolve(options.staticRoot)));
  }
  app.use("/data", express.static(dataRoot()));
  app.use("/api/manifest", manifestRoutes);
  app.use("/api/subjects", subjectRoutes);
  app.use("/api/subjects", noteRoutes);
  app.use("/api/subjects", assetRoutes);
  app.use("/api/templates", templateRoutes);
  app.use("/api/workspace", workspaceRoutes);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  });
  return app;
}
