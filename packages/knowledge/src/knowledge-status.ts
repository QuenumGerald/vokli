import type { KnowledgeDocument } from "./knowledge-files.js";
import type { AgentKnowledgeState } from "./knowledge-state.js";
import type {
  KnowledgeFileChange,
  KnowledgeFileStatus,
  KnowledgeStatus,
} from "./knowledge-types.js";

export function createKnowledgeStatus(
  documents: readonly KnowledgeDocument[],
  state?: AgentKnowledgeState,
): KnowledgeStatus {
  return {
    configured: true,
    files: createFileStatuses(documents, state),
    ...(state?.knowledgeBaseId
      ? { knowledgeBaseId: state.knowledgeBaseId }
      : {}),
    ...(state?.lastSyncedAt ? { lastSyncedAt: state.lastSyncedAt } : {}),
    ...(state?.pendingKnowledgeBaseUpdate
      ? { pendingKnowledgeBaseUpdate: true }
      : {}),
  };
}

export function createFileStatuses(
  documents: readonly KnowledgeDocument[],
  state?: AgentKnowledgeState,
): readonly KnowledgeFileStatus[] {
  return documents.map((document) => {
    const stored = state?.files[document.source];
    const change: KnowledgeFileChange = !stored
      ? "new"
      : stored.hash === document.hash
        ? "synced"
        : "modified";
    return { source: document.source, hash: document.hash, change };
  });
}
