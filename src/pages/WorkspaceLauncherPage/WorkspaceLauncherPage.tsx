import { useState } from "react";
import type { StorageAdapter } from "../../shared/storage/storageAdapter";
import { createWorkspaceStorageAdapter, openWorkspaceStorageAdapter } from "../../shared/storage/workspaceStorageAdapter";
import type { RecentWorkspaceRecord } from "../../shared/storage/recentWorkspaceStore";

type WorkspaceLauncherPageProps = {
  recentWorkspace: RecentWorkspaceRecord | null;
  onWorkspaceReady: (storage: StorageAdapter, workspaceName: string, root: FileSystemDirectoryHandle) => Promise<void>;
  onOpenRecentWorkspace: () => Promise<void>;
};

async function pickWorkspaceDirectory() {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("This browser does not support folder picking.");
  }
  return window.showDirectoryPicker({ mode: "readwrite" });
}

export function WorkspaceLauncherPage({ recentWorkspace, onWorkspaceReady, onOpenRecentWorkspace }: WorkspaceLauncherPageProps) {
  const [busy, setBusy] = useState<"create" | "open" | "recent" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateWorkspace() {
    setBusy("create");
    setError(null);
    try {
      const root = await pickWorkspaceDirectory();
      const storage = await createWorkspaceStorageAdapter(root);
      await onWorkspaceReady(storage, root.name, root);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenWorkspace() {
    setBusy("open");
    setError(null);
    try {
      const root = await pickWorkspaceDirectory();
      const storage = await openWorkspaceStorageAdapter(root);
      await onWorkspaceReady(storage, root.name, root);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenRecentWorkspace() {
    setBusy("recent");
    setError(null);
    try {
      await onOpenRecentWorkspace();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="app-shell">
      <section className="panel workspace-launcher">
        <div className="eyebrow">godnote</div>
        <h1>Home</h1>
        <p>ワークスペースを作成するか、既存フォルダを開いて編集を始めます。直前の workspace も記憶しています。</p>
        <div className="actions">
          <button type="button" className="primary-button" onClick={() => void handleCreateWorkspace()} disabled={busy !== null}>
            {busy === "create" ? "作成中..." : "ワークスペースを作成"}
          </button>
          <button type="button" className="secondary-button" onClick={() => void handleOpenWorkspace()} disabled={busy !== null}>
            {busy === "open" ? "確認中..." : "ワークスペースを開く"}
          </button>
          {recentWorkspace ? (
            <button type="button" className="secondary-button" onClick={() => void handleOpenRecentWorkspace()} disabled={busy !== null}>
              {busy === "recent" ? "再開中..." : `直前の workspace を開く (${recentWorkspace.name})`}
            </button>
          ) : null}
        </div>
        <ul className="workspace-notes">
          <li>作成時は `manifest.json`、`subjects/`、`notes/`、`.github/workflows/deploy-pages.yml` を生成します。</li>
          <li>既存フォルダを開く場合は、`manifest.json` がある workspace だけを受け付けます。</li>
          <li>Git 管理はこの段階では行いません。ユーザー側で自由に管理できます。</li>
        </ul>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
