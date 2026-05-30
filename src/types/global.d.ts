declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  export function getDocument(source: { data: Uint8Array; useWorkerFetch?: boolean }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getViewport(options: { scale: number }): { width: number; height: number };
        render(args: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
      }>;
    }>;
  };
}

interface Window {
  showDirectoryPicker(options?: { mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
  godnote?: {
    isElectron: true;
    pickWorkspaceDirectory: () => Promise<string | null>;
    getLastWorkspace: () => Promise<{ name: string; path: string; updatedAt: string } | null>;
    getRecentWorkspaces: () => Promise<Array<{ name: string; path: string; updatedAt: string }>>;
    saveRecentWorkspace: (record: { name: string; path: string }) => Promise<{ name: string; path: string; updatedAt: string }>;
  };
}
