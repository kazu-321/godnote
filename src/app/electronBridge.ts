export type ElectronWorkspaceRecord = {
  name: string;
  path: string;
  updatedAt: string;
};

export type GodnoteElectronBridge = {
  isElectron: true;
  pickWorkspaceDirectory: () => Promise<string | null>;
  getLastWorkspace: () => Promise<ElectronWorkspaceRecord | null>;
  getRecentWorkspaces: () => Promise<ElectronWorkspaceRecord[]>;
  saveRecentWorkspace: (record: { name: string; path: string }) => Promise<ElectronWorkspaceRecord>;
};

export function isElectronRuntime() {
  return window.godnote?.isElectron === true;
}

export function getElectronBridge() {
  if (!isElectronRuntime() || !window.godnote) {
    throw new Error("Electron bridge is not available.");
  }
  return window.godnote;
}
