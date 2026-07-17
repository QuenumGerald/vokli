import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface StoredKnowledgeFile {
  readonly hash: string;
  readonly vapiFileId: string;
}

export interface AgentKnowledgeState {
  readonly agentId?: string;
  readonly files: Readonly<Record<string, StoredKnowledgeFile>>;
  readonly queryToolId?: string;
  /** Migrated from state v1; never used as a remote resource. */
  readonly legacyKnowledgeBaseId?: string;
  readonly assistantId?: string;
  readonly deploymentHash?: string;
  readonly deployedAt?: string;
  readonly lastSyncedAt?: string;
  readonly pending?: readonly string[];
}

export interface VokliState {
  readonly version: 2;
  readonly agents: Readonly<Record<string, AgentKnowledgeState>>;
}

const EMPTY_STATE: VokliState = { version: 2, agents: {} };

export async function readKnowledgeState(
  statePath: string,
): Promise<VokliState> {
  try {
    const value: unknown = JSON.parse(await readFile(statePath, "utf8"));
    if (isV1(value)) return migrateV1(value);
    if (!isV2(value)) {
      throw new Error(
        `Invalid Vokli state at ${statePath}. Repair or move the file; it was not overwritten.`,
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
  const next: VokliState = {
    version: 2,
    agents: { ...current.agents, [agentId]: { ...agentState, agentId } },
  };
  const temporaryPath = `${statePath}.tmp`;
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporaryPath, statePath);
}

function isV1(
  value: unknown,
): value is { version: 1; agents: Record<string, Record<string, unknown>> } {
  return (
    isRecord(value) &&
    value.version === 1 &&
    isRecord(value.agents) &&
    Object.values(value.agents).every((agent) => validAgent(agent, true))
  );
}

function migrateV1(value: {
  version: 1;
  agents: Record<string, Record<string, unknown>>;
}): VokliState {
  const agents: Record<string, AgentKnowledgeState> = {};
  for (const [id, old] of Object.entries(value.agents)) {
    agents[id] = {
      agentId: id,
      files: old.files as Record<string, StoredKnowledgeFile>,
      ...(typeof old.assistantId === "string"
        ? { assistantId: old.assistantId }
        : {}),
      ...(typeof old.lastSyncedAt === "string"
        ? { lastSyncedAt: old.lastSyncedAt }
        : {}),
      ...(typeof old.knowledgeBaseId === "string"
        ? { legacyKnowledgeBaseId: old.knowledgeBaseId }
        : {}),
      ...(old.pendingKnowledgeBaseUpdate === true
        ? { pending: ["query-tool"] }
        : {}),
    };
  }
  return { version: 2, agents };
}

function isV2(value: unknown): value is VokliState {
  return (
    isRecord(value) &&
    value.version === 2 &&
    isRecord(value.agents) &&
    Object.values(value.agents).every((agent) => validAgent(agent, false))
  );
}

function validAgent(value: unknown, legacy: boolean): boolean {
  if (!isRecord(value) || !isRecord(value.files)) return false;
  if (
    !Object.values(value.files).every(
      (file) =>
        isRecord(file) && validId(file.vapiFileId) && validHash(file.hash),
    )
  )
    return false;
  const ids = legacy
    ? ["assistantId", "knowledgeBaseId"]
    : ["assistantId", "queryToolId", "legacyKnowledgeBaseId"];
  if (!ids.every((key) => value[key] === undefined || validId(value[key])))
    return false;
  for (const key of ["lastSyncedAt", "deployedAt"])
    if (value[key] !== undefined && !validDate(value[key])) return false;
  if (value.deploymentHash !== undefined && !validHash(value.deploymentHash))
    return false;
  if (
    value.pending !== undefined &&
    (!Array.isArray(value.pending) ||
      !value.pending.every((item) => typeof item === "string"))
  )
    return false;
  return (
    value.pendingKnowledgeBaseUpdate === undefined ||
    typeof value.pendingKnowledgeBaseUpdate === "boolean"
  );
}

function validId(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 512
  );
}
function validHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
