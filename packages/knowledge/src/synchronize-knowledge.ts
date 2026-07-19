import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { AgentDefinition } from "../../core/dist/index.js";
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
  readonly deployedAssistantId?: string;
}

export async function synchronizeKnowledge(
  input: SynchronizeKnowledgeInput,
): Promise<KnowledgeSyncResult> {
  const files: Record<string, StoredKnowledgeFile> = {
    ...(input.previous?.files ?? {}),
  };
  let uploadedFiles = 0;
  for (const document of input.documents) {
    const stored = files[document.source];
    if (stored?.hash === document.hash) continue;
    const uploaded = await input.client.uploadFile({
      path: document.absolutePath,
      fileName: basename(document.absolutePath),
      content: await readFile(document.absolutePath),
    });
    files[document.source] = { hash: document.hash, vapiFileId: uploaded.id };
    uploadedFiles++;
    await save(input, { ...input.previous, files, pending: ["query-tool"] });
  }
  for (const source of Object.keys(files))
    if (!input.documents.some((d) => d.source === source)) delete files[source];

  const fileIds = input.documents.map(
    (document) => files[document.source]!.vapiFileId,
  );
  let queryToolId = input.previous?.queryToolId;
  const changed =
    uploadedFiles > 0 ||
    input.previous?.pending?.includes("query-tool") ||
    Object.keys(input.previous?.files ?? {}).length !== input.documents.length;
  const toolInput = { name: `${input.agent.id}-knowledge`, fileIds };
  if (!queryToolId) {
    queryToolId = (await createTool(input.client, toolInput)).id;
    await save(input, {
      ...input.previous,
      files,
      queryToolId,
      pending: ["assistant-attachment"],
    });
  } else if (changed) {
    await updateTool(input.client, queryToolId, toolInput);
    await save(input, {
      ...input.previous,
      files,
      queryToolId,
      pending: ["assistant-attachment"],
    });
  }

  const assistantId =
    input.deployedAssistantId ?? input.agent.knowledge?.assistantId;
  if (
    assistantId &&
    (input.previous?.assistantId !== assistantId ||
      input.previous?.pending?.includes("assistant-attachment"))
  ) {
    await attachTool(input.client, assistantId, queryToolId);
  }
  const finalState: AgentKnowledgeState = {
    ...input.previous,
    files,
    queryToolId,
    ...(assistantId ? { assistantId } : {}),
    lastSyncedAt: input.syncedAt,
    pending: [],
  };
  await save(input, finalState);
  return {
    configured: true,
    files: createFileStatuses(input.documents, finalState),
    queryToolId,
    lastSyncedAt: input.syncedAt,
    uploadedFiles,
  };
}

async function createTool(
  client: VapiKnowledgeApi,
  input: { name: string; fileIds: readonly string[] },
) {
  if (client.createQueryTool) return client.createQueryTool(input);
  if (client.createKnowledgeBase) return client.createKnowledgeBase(input);
  throw new Error("Vapi client must implement createQueryTool().");
}
async function updateTool(
  client: VapiKnowledgeApi,
  id: string,
  input: { name: string; fileIds: readonly string[] },
) {
  if (client.updateQueryTool) return client.updateQueryTool(id, input);
  if (client.updateKnowledgeBase) return client.updateKnowledgeBase(id, input);
  throw new Error("Vapi client must implement updateQueryTool().");
}
async function attachTool(
  client: VapiKnowledgeApi,
  assistantId: string,
  id: string,
) {
  if (client.attachQueryToolToAssistant)
    return client.attachQueryToolToAssistant(assistantId, id);
  if (client.attachKnowledgeBaseToAssistant)
    return client.attachKnowledgeBaseToAssistant(assistantId, id);
  throw new Error("Vapi client must implement attachQueryToolToAssistant().");
}

async function save(
  input: SynchronizeKnowledgeInput,
  state: AgentKnowledgeState,
): Promise<void> {
  await writeAgentKnowledgeState(input.statePath, input.agent.id, state);
}
