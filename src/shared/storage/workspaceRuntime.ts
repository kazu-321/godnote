import { isElectronRuntime, getElectronBridge } from "../../app/electronBridge";
import type { StorageAdapter } from "./storageAdapter";
import { LocalApiStorageAdapter } from "./localApiStorageAdapter";
import { loadRecentWorkspace, loadRecentWorkspaces, saveRecentWorkspace, type RecentWorkspaceRecord } from "./recentWorkspaceStore";
import { createWorkspaceStorageAdapter, openWorkspaceStorageAdapter } from "./workspaceStorageAdapter";

type OpenedWorkspace = {
  storage: StorageAdapter;
  name: string;
  handle?: FileSystemDirectoryHandle;
  path?: string;
};

async function requestWorkspaceJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Workspace API error ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
}

export async function activateWorkspacePath(workspacePath: string) {
  return requestWorkspaceJson<{ path: string; name: string }>("/api/workspace", {
    method: "PUT",
    body: JSON.stringify({ path: workspacePath }),
  });
}

export async function createWorkspacePath(workspacePath: string) {
  return requestWorkspaceJson<{ path: string; name: string }>("/api/workspace/create", {
    method: "POST",
    body: JSON.stringify({ path: workspacePath }),
  });
}

export async function loadStoredRecentWorkspace() {
  if (isElectronRuntime()) {
    return getElectronBridge().getLastWorkspace();
  }
  return loadRecentWorkspace();
}

export async function loadStoredRecentWorkspaces() {
  if (isElectronRuntime()) {
    return getElectronBridge().getRecentWorkspaces();
  }
  return loadRecentWorkspaces();
}

export async function persistRecentWorkspace(record: { name: string; handle?: FileSystemDirectoryHandle; path?: string }) {
  if (isElectronRuntime()) {
    if (!record.path) {
      throw new Error("Workspace path is required.");
    }
    return getElectronBridge().saveRecentWorkspace({ name: record.name, path: record.path });
  }
  if (!record.handle) {
    throw new Error("Workspace handle is required.");
  }
  return saveRecentWorkspace({ name: record.name, handle: record.handle });
}

export async function restoreStoredWorkspace(record: RecentWorkspaceRecord): Promise<OpenedWorkspace> {
  if (isElectronRuntime()) {
    if (!record.path) {
      throw new Error("Workspace path is required.");
    }
    const opened = await activateWorkspacePath(record.path);
    return {
      storage: new LocalApiStorageAdapter(),
      name: opened.name,
      path: opened.path,
    };
  }
  if (!record.handle) {
    throw new Error("Workspace handle is required.");
  }
  const storage = await openWorkspaceStorageAdapter(record.handle);
  return {
    storage,
    name: record.name,
    handle: record.handle,
  };
}

export async function pickWorkspaceDirectoryPath() {
  if (isElectronRuntime()) {
    return getElectronBridge().pickWorkspaceDirectory();
  }
  if (!("showDirectoryPicker" in window)) {
    throw new Error("This browser does not support folder picking.");
  }
  return window.showDirectoryPicker({ mode: "readwrite" });
}

export async function createWorkspaceFromPicker() {
  const picked = await pickWorkspaceDirectoryPath();
  if (!picked) {
    throw new Error("Workspace selection was cancelled.");
  }
  if (typeof picked === "string") {
    const created = await createWorkspacePath(picked);
    return {
      storage: new LocalApiStorageAdapter(),
      name: created.name,
      path: created.path,
    } satisfies OpenedWorkspace;
  }
  const storage = await createWorkspaceStorageAdapter(picked);
  return {
    storage,
    name: picked.name,
    handle: picked,
  } satisfies OpenedWorkspace;
}

export async function openWorkspaceFromPicker() {
  const picked = await pickWorkspaceDirectoryPath();
  if (!picked) {
    throw new Error("Workspace selection was cancelled.");
  }
  if (typeof picked === "string") {
    const opened = await activateWorkspacePath(picked);
    return {
      storage: new LocalApiStorageAdapter(),
      name: opened.name,
      path: opened.path,
    } satisfies OpenedWorkspace;
  }
  const storage = await openWorkspaceStorageAdapter(picked);
  return {
    storage,
    name: picked.name,
    handle: picked,
  } satisfies OpenedWorkspace;
}
