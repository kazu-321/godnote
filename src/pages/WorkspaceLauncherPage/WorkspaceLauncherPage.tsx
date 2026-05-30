import { useState } from "react";
import type { StorageAdapter } from "../../shared/storage/storageAdapter";
import type { RecentWorkspaceRecord } from "../../shared/storage/recentWorkspaceStore";
import { createWorkspaceFromPicker, openWorkspaceFromPicker } from "../../shared/storage/workspaceRuntime";

type WorkspaceLauncherPageProps = {
  recentWorkspace: RecentWorkspaceRecord | null;
  savedWorkspaces: RecentWorkspaceRecord[];
  showSavedWorkspaces: boolean;
  onWorkspaceReady: (
    storage: StorageAdapter,
    workspaceName: string,
    identity?: { handle?: FileSystemDirectoryHandle; path?: string },
  ) => Promise<void>;
  onOpenRecentWorkspace: () => Promise<void>;
  onOpenSavedWorkspace: (workspace: RecentWorkspaceRecord) => Promise<void>;
};

export function WorkspaceLauncherPage({ recentWorkspace, savedWorkspaces, showSavedWorkspaces, onWorkspaceReady, onOpenRecentWorkspace, onOpenSavedWorkspace }: WorkspaceLauncherPageProps) {
  const [busy, setBusy] = useState<"create" | "open" | "recent" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleSavedWorkspaces = showSavedWorkspaces ? savedWorkspaces : [];

  async function handleCreateWorkspace() {
    setBusy("create");
    setError(null);
    try {
      const opened = await createWorkspaceFromPicker();
      await onWorkspaceReady(opened.storage, opened.name, {
        handle: opened.handle,
        path: opened.path,
      });
    } catch (nextError) {
      if (nextError instanceof Error && nextError.message === "Workspace selection was cancelled.") {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenWorkspace() {
    setBusy("open");
    setError(null);
    try {
      const opened = await openWorkspaceFromPicker();
      await onWorkspaceReady(opened.storage, opened.name, {
        handle: opened.handle,
        path: opened.path,
      });
    } catch (nextError) {
      if (nextError instanceof Error && nextError.message === "Workspace selection was cancelled.") {
        return;
      }
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

  async function handleOpenSavedWorkspace(workspace: RecentWorkspaceRecord) {
    setBusy("recent");
    setError(null);
    try {
      await onOpenSavedWorkspace(workspace);
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
          <li>作成時は `manifest.json`、`subjects/`、`notes/`、`viewer/index.html`、`viewer/viewer.html`、`.github/workflows/deploy-pages.yml` を生成します。</li>
          <li>既存フォルダを開く場合は、`manifest.json` がある workspace だけを受け付けます。</li>
          <li>Git 管理はこの段階では行いません。ユーザー側で自由に管理できます。</li>
        </ul>
        {showSavedWorkspaces ? (
          <section className="saved-workspaces">
            <h2>保存済み workspace</h2>
            {visibleSavedWorkspaces.length > 0 ? (
              <div className="saved-workspace-list">
                {visibleSavedWorkspaces.map((workspace) => (
                  <button key={`${workspace.path ?? workspace.name}-${workspace.updatedAt}`} type="button" className="workspace-entry" onClick={() => void handleOpenSavedWorkspace(workspace)} disabled={busy !== null}>
                    <strong>{workspace.name}</strong>
                    <span>最終更新 {new Date(workspace.updatedAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="workspace-notes">まだ保存済み workspace はありません。</p>
            )}
          </section>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
