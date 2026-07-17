import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface StoredKnowledgeFile {
  readonly hash: string;
  readonly vapiFileId: string;
}

export interface AgentKnowledgeState {
  readonly files: Readonly<Record<string, StoredKnowledgeFile>>;
  readonly knowledgeBaseId?: string;
  readonly assistantId?: string;
  readonly lastSyncedAt?: string;
  readonly pendingKnowledgeBaseUpdate?: boolean;
}

interface KnowledgeState {
  readonly version: 1;
  readonly agents: Readonly<Record<string, AgentKnowledgeState>>;
}

const EMPTY_STATE: KnowledgeState = { version: 1, agents: {} };

export async function readKnowledgeState(
  statePath: string,
): Promise<KnowledgeState> {
  try {
    const value: unknown = JSON.parse(await readFile(statePath, "utf8"));
    if (!isKnowledgeState(value)) {
      throw new Error(
        `Invalid Vokli state at ${statePath}. Remove or repair the file before synchronizing.`,
      );
    }
    return value;
  } catch (error) {
    if (isFileNotFound(error)) return EMPTY_STATE;
    throw error;
  }
}

export async function writeAgentKnowledgeState(
  statePath: string,
  agentId: string,
  agentState: AgentKnowledgeState,
): Promise<void> {
  const current = await readKnowledgeState(statePath);
  const next: KnowledgeState = {
    version: 1,
    agents: { ...current.agents, [agentId]: agentState },
  };
  const temporaryPath = `${statePath}.tmp`;
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporaryPath, statePath);
}

function isKnowledgeState(value: unknown): value is KnowledgeState {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.agents)) {
    return false;
  }

  return Object.values(value.agents).every((agent) => {
    if (!isRecord(agent) || !isRecord(agent.files)) return false;
    return (
      Object.values(agent.files).every(
        (file) =>
          isRecord(file) &&
          typeof file.hash === "string" &&
          typeof file.vapiFileId === "string",
      ) &&
      (agent.pendingKnowledgeBaseUpdate === undefined ||
        typeof agent.pendingKnowledgeBaseUpdate === "boolean")
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
