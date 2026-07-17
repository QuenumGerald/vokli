import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type { AgentDefinition } from "@vokli/core";

import type { VapiKnowledgeApi } from "./knowledge-api.js";
import type { KnowledgeDocument } from "./knowledge-files.js";
import type {
  AgentKnowledgeState,
  StoredKnowledgeFile,
} from "./knowledge-state.js";
import { writeAgentKnowledgeState } from "./knowledge-state.js";
import { createFileStatuses } from "./knowledge-status.js";
import type { KnowledgeSyncResult } from "./knowledge-types.js";

export interface SynchronizeKnowledgeInput {
  readonly agent: AgentDefinition;
  readonly documents: readonly KnowledgeDocument[];
  readonly previous: AgentKnowledgeState | undefined;
  readonly client: VapiKnowledgeApi;
  readonly statePath: string;
  readonly syncedAt: string;
}

export async function synchronizeKnowledge(
  input: SynchronizeKnowledgeInput,
): Promise<KnowledgeSyncResult> {
  const { files, uploadedFiles } = await uploadChangedFiles(input);
  const partialState = createPartialState(input.previous, files);
  if (uploadedFiles > 0) {
    await writeAgentKnowledgeState(
      input.statePath,
      input.agent.id,
      partialState,
    );
  }

  const fileIds = resolveFileIds(input.documents, files);
  const sourceSetChanged =
    Object.keys(input.previous?.files ?? {}).length !== input.documents.length;
  const contentChanged =
    uploadedFiles > 0 ||
    sourceSetChanged ||
    input.previous?.pendingKnowledgeBaseUpdate === true;
  const knowledgeBaseId = await synchronizeKnowledgeBase(
    input,
    fileIds,
    contentChanged,
  );
  await attachAssistantWhenNeeded(input, knowledgeBaseId);

  const finalState: AgentKnowledgeState = {
    files,
    knowledgeBaseId,
    ...(input.agent.knowledge?.assistantId
      ? { assistantId: input.agent.knowledge.assistantId }
      : {}),
    lastSyncedAt: input.syncedAt,
  };
  await writeAgentKnowledgeState(input.statePath, input.agent.id, finalState);

  return {
    configured: true,
    files: createFileStatuses(input.documents, finalState),
    knowledgeBaseId,
    lastSyncedAt: input.syncedAt,
    uploadedFiles,
  };
}

async function uploadChangedFiles(input: SynchronizeKnowledgeInput): Promise<{
  files: Record<string, StoredKnowledgeFile>;
  uploadedFiles: number;
}> {
  const files: Record<string, StoredKnowledgeFile> = {};
  let uploadedFiles = 0;

  for (const document of input.documents) {
    const stored = input.previous?.files[document.source];
    if (stored?.hash === document.hash) {
      files[document.source] = stored;
      continue;
    }

    const uploaded = await input.client.uploadFile({
      path: document.absolutePath,
      fileName: basename(document.absolutePath),
      content: await readFile(document.absolutePath),
    });
    files[document.source] = {
      hash: document.hash,
      vapiFileId: uploaded.id,
    };
    uploadedFiles += 1;
  }

  return { files, uploadedFiles };
}

function createPartialState(
  previous: AgentKnowledgeState | undefined,
  files: Readonly<Record<string, StoredKnowledgeFile>>,
): AgentKnowledgeState {
  return {
    files,
    ...(previous?.knowledgeBaseId
      ? {
          knowledgeBaseId: previous.knowledgeBaseId,
          pendingKnowledgeBaseUpdate: true,
        }
      : {}),
    ...(previous?.assistantId ? { assistantId: previous.assistantId } : {}),
    ...(previous?.lastSyncedAt ? { lastSyncedAt: previous.lastSyncedAt } : {}),
  };
}

function resolveFileIds(
  documents: readonly KnowledgeDocument[],
  files: Readonly<Record<string, StoredKnowledgeFile>>,
): readonly string[] {
  return documents.map((document) => {
    const fileId = files[document.source]?.vapiFileId;
    if (!fileId) {
      throw new Error(
        `Missing Vapi file ID for knowledge source: ${document.source}`,
      );
    }
    return fileId;
  });
}

async function synchronizeKnowledgeBase(
  input: SynchronizeKnowledgeInput,
  fileIds: readonly string[],
  contentChanged: boolean,
): Promise<string> {
  if (!input.previous?.knowledgeBaseId) {
    const created = await input.client.createKnowledgeBase({
      name: `${input.agent.id}-knowledge`,
      fileIds,
    });
    return created.id;
  }

  if (contentChanged) {
    await input.client.updateKnowledgeBase(input.previous.knowledgeBaseId, {
      fileIds,
    });
  }
  return input.previous.knowledgeBaseId;
}

async function attachAssistantWhenNeeded(
  input: SynchronizeKnowledgeInput,
  knowledgeBaseId: string,
): Promise<void> {
  const assistantId = input.agent.knowledge?.assistantId;
  if (assistantId && assistantId !== input.previous?.assistantId) {
    await input.client.attachKnowledgeBaseToAssistant(
      assistantId,
      knowledgeBaseId,
    );
  }
}
