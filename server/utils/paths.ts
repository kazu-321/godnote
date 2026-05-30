import path from "node:path";

let activeDataRoot: string | null = process.env.GODNOTE_DATA_ROOT ? path.resolve(process.env.GODNOTE_DATA_ROOT) : null;

export function isElectronManagedRuntime() {
  return process.env.GODNOTE_ELECTRON === "1";
}

export function setActiveDataRoot(root: string) {
  activeDataRoot = path.resolve(root);
  process.env.GODNOTE_DATA_ROOT = activeDataRoot;
}

export function getActiveWorkspace() {
  if (!activeDataRoot) return null;
  return { path: activeDataRoot, name: path.basename(activeDataRoot) };
}

export function dataRoot() {
  if (activeDataRoot) return activeDataRoot;
  return path.resolve(process.env.GODNOTE_DATA_ROOT ?? "sample_workspace");
}
export function manifestPath() {
  return path.join(dataRoot(), "manifest.json");
}
export function subjectsDir() {
  return path.join(dataRoot(), "subjects");
}
export function notesDir() {
  return path.join(dataRoot(), "notes");
}
export function subjectPath(subjectId: string) {
  return path.join(subjectsDir(), `${subjectId}.json`);
}
export function noteMetaPath(subjectId: string, noteId: string) {
  return path.join(notesDir(), subjectId, noteId, "meta.json");
}
export function noteDataPath(subjectId: string, noteId: string) {
  return path.join(notesDir(), subjectId, noteId, "note.json");
}
export function noteAssetPath(subjectId: string, noteId: string, assetPath: string) {
  return path.join(notesDir(), subjectId, noteId, assetPath);
}
