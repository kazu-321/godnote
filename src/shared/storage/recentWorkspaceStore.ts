const DB_NAME = "godnote";
const DB_VERSION = 2;
const STORE_NAME = "recent-workspaces";
const LAST_KEY = "last";
const LIST_KEY = "list";

export type RecentWorkspaceRecord = {
  name: string;
  handle?: FileSystemDirectoryHandle;
  path?: string;
  updatedAt: string;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open workspace storage."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let settled = false;

    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    transaction.onerror = () => fail(transaction.error ?? new Error("Failed to access workspace storage."));
    transaction.onabort = () => fail(transaction.error ?? new Error("Workspace storage transaction aborted."));

    try {
      const result = run(store);
      if (result instanceof Promise) {
        result.then((value) => finish(value)).catch(fail);
        return;
      }
      result.onsuccess = () => finish(result.result);
      result.onerror = () => fail(result.error ?? new Error("Workspace storage request failed."));
    } catch (error) {
      fail(error);
    }
  }).finally(() => {
    db.close();
  });
}

async function readRecords(key: string) {
  return withStore<RecentWorkspaceRecord[] | null>("readonly", (store) => {
    const request = store.get(key) as IDBRequest<RecentWorkspaceRecord[] | undefined>;
    return new Promise<RecentWorkspaceRecord[] | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Failed to read recent workspace."));
    });
  });
}

async function writeValue<T>(key: string, value: T) {
  await withStore("readwrite", (store) => store.put(value, key));
}

async function writeRecords(key: string, records: RecentWorkspaceRecord[]) {
  await withStore("readwrite", (store) => store.put(records, key));
}

async function sameWorkspace(a: RecentWorkspaceRecord, b: RecentWorkspaceRecord) {
  if (a.path && b.path) {
    return a.path === b.path;
  }
  if (!a.handle || !b.handle) {
    return false;
  }
  const handle = a.handle as FileSystemDirectoryHandle & {
    isSameEntry?: (other: FileSystemHandle) => Promise<boolean>;
  };
  try {
    return Boolean(await handle.isSameEntry?.(b.handle));
  } catch {
    return false;
  }
}

export async function saveRecentWorkspace(record: Omit<RecentWorkspaceRecord, "updatedAt">) {
  if (!record.handle) {
    throw new Error("Workspace handle is required.");
  }
  const nextRecord: RecentWorkspaceRecord = { ...record, updatedAt: new Date().toISOString() };
  const existing = (await readRecords(LIST_KEY)) ?? [];
  const nextList: RecentWorkspaceRecord[] = [nextRecord];
  for (const current of existing) {
    if (await sameWorkspace(current, nextRecord)) continue;
    nextList.push(current);
  }
  await writeRecords(LIST_KEY, nextList);
  await writeValue(LAST_KEY, nextRecord);
  return nextRecord;
}

export async function loadRecentWorkspace() {
  return withStore<RecentWorkspaceRecord | null>("readonly", (store) => {
    const request = store.get(LAST_KEY) as IDBRequest<RecentWorkspaceRecord | undefined>;
    return new Promise<RecentWorkspaceRecord | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Failed to read recent workspace."));
    });
  });
}

export async function loadRecentWorkspaces() {
  return (await readRecords(LIST_KEY)) ?? [];
}

export async function clearRecentWorkspace() {
  await withStore("readwrite", (store) => store.delete(LAST_KEY));
  await withStore("readwrite", (store) => store.delete(LIST_KEY));
}
