export interface KnowledgeIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type KnowledgeValidationResult =
  | { readonly success: true; readonly files: readonly KnowledgeFileStatus[] }
  | { readonly success: false; readonly errors: readonly KnowledgeIssue[] };

export type KnowledgeFileChange = "modified" | "new" | "synced";

export interface KnowledgeFileStatus {
  readonly source: string;
  readonly hash: string;
  readonly change: KnowledgeFileChange;
}

export interface KnowledgeStatus {
  readonly configured: boolean;
  readonly files: readonly KnowledgeFileStatus[];
  readonly knowledgeBaseId?: string;
  readonly lastSyncedAt?: string;
  readonly pendingKnowledgeBaseUpdate?: boolean;
}

export interface KnowledgeSyncResult extends KnowledgeStatus {
  readonly configured: true;
  readonly uploadedFiles: number;
}
