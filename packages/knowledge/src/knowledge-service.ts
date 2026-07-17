import { join } from "node:path";

import type { AgentDefinition } from "@vokli/core";

import type { VapiKnowledgeApi } from "./knowledge-api.js";
import { inspectKnowledgeFiles } from "./knowledge-files.js";
import { readKnowledgeState } from "./knowledge-state.js";
import {
  createFileStatuses,
  createKnowledgeStatus,
} from "./knowledge-status.js";
import type {
  KnowledgeIssue,
  KnowledgeStatus,
  KnowledgeSyncResult,
  KnowledgeValidationResult,
} from "./knowledge-types.js";
import { synchronizeKnowledge } from "./synchronize-knowledge.js";

export interface KnowledgeService {
  validate(agent: AgentDefinition): Promise<KnowledgeValidationResult>;
  sync(agent: AgentDefinition): Promise<KnowledgeSyncResult>;
  status(agent: AgentDefinition): Promise<KnowledgeStatus>;
}

export interface CreateKnowledgeServiceOptions {
  readonly client?: VapiKnowledgeApi;
  readonly cwd?: string;
  readonly statePath?: string;
  readonly now?: () => Date;
}

export class KnowledgeSyncError extends Error {
  readonly issues: readonly KnowledgeIssue[];

  constructor(message: string, issues: readonly KnowledgeIssue[] = []) {
    super(message);
    this.name = "KnowledgeSyncError";
    this.issues = issues;
  }
}

export function createKnowledgeService(
  options: CreateKnowledgeServiceOptions = {},
): KnowledgeService {
  const cwd = options.cwd ?? process.cwd();
  const statePath = options.statePath ?? join(cwd, ".vokli", "state.json");
  const now = options.now ?? (() => new Date());

  async function inspect(agent: AgentDefinition) {
    if (!agent.knowledge) return undefined;
    const files = await inspectKnowledgeFiles(agent.knowledge, cwd);
    const state = await readKnowledgeState(statePath);
    return { files, state: state.agents[agent.id] };
  }

  return {
    async validate(agent) {
      const result = await inspect(agent);
      if (!result) return { success: true, files: [] };
      if (!result.files.success) {
        return { success: false, errors: result.files.issues };
      }
      return {
        success: true,
        files: createFileStatuses(result.files.documents, result.state),
      };
    },

    async status(agent) {
      const result = await inspect(agent);
      if (!result) return { configured: false, files: [] };
      if (!result.files.success) {
        throw new KnowledgeSyncError(
          "Knowledge configuration is invalid.",
          result.files.issues,
        );
      }
      return createKnowledgeStatus(result.files.documents, result.state);
    },

    async sync(agent) {
      if (!agent.knowledge) {
        throw new KnowledgeSyncError(
          "Agent has no knowledge provider. Add vapiKnowledge() before synchronizing.",
        );
      }
      const inspected = await inspect(agent);
      if (!inspected || !inspected.files.success) {
        throw new KnowledgeSyncError(
          "Knowledge configuration is invalid.",
          inspected?.files.success === false ? inspected.files.issues : [],
        );
      }
      if (!options.client) {
        throw new KnowledgeSyncError(
          "Knowledge synchronization requires a VapiKnowledgeApi client.",
        );
      }

      return synchronizeKnowledge({
        agent,
        documents: inspected.files.documents,
        previous: inspected.state,
        client: options.client,
        statePath,
        syncedAt: now().toISOString(),
        ...(inspected.state?.assistantId
          ? { deployedAssistantId: inspected.state.assistantId }
          : {}),
      });
    },
  };
}
