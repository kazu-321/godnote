import type {
  AssetRef,
  CreateNoteInput,
  CreateSubjectInput,
  DeleteAssetInput,
  GenerateThumbnailInput,
  NoteData,
  NoteMeta,
  LoadAssetInput,
  WritePngAssetInput,
} from "../../features/notes/model/noteTypes";
import type { AppManifest } from "../../features/notes/model/manifestTypes";
import type { SubjectData } from "../../features/notes/model/subjectTypes";

export interface StorageAdapter {
  loadManifest(): Promise<AppManifest>;
  saveManifest(manifest: AppManifest): Promise<void>;
  loadSubject(subjectId: string): Promise<SubjectData>;
  saveSubject(subject: SubjectData): Promise<void>;
  loadNoteMeta(subjectId: string, noteId: string): Promise<NoteMeta>;
  saveNoteMeta(meta: NoteMeta): Promise<void>;
  loadNote(subjectId: string, noteId: string): Promise<NoteData>;
  saveNote(note: NoteData): Promise<void>;
  createSubject(input: CreateSubjectInput): Promise<SubjectData>;
  deleteSubject(subjectId: string): Promise<void>;
  createNote(input: CreateNoteInput): Promise<NoteData>;
  deleteNote(subjectId: string, noteId: string): Promise<void>;
  loadAsset(input: LoadAssetInput): Promise<Uint8Array>;
  writePngAsset(input: WritePngAssetInput): Promise<AssetRef>;
  deleteAsset(input: DeleteAssetInput): Promise<void>;
  generateThumbnail(input: GenerateThumbnailInput): Promise<AssetRef>;
}
