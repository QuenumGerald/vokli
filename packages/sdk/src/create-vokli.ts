import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  generateReceptionistPrompt,
  validateAgent,
  type AgentDefinition,
  type StructuredOutputDraft,
  type ValidationResult,
} from "@vokli/core";
import {
  generateVapiAssistantConfig,
  createVapiApi,
  type GeneratedVapiResources,
  type VapiApi,
  type VapiGenerationOptions,
} from "@vokli/vapi";
import {
  createKnowledgeService,
  readKnowledgeState,
  writeAgentKnowledgeState,
  type CreateKnowledgeServiceOptions,
  type KnowledgeService,
  type VapiKnowledgeApi,
} from "@vokli/knowledge";
import { VokliValidationError } from "./vokli-validation-error.js";

export interface GeneratedAgent {
  readonly agent: AgentDefinition;
  readonly prompt: string;
  readonly structuredOutputs: readonly StructuredOutputDraft[];
  readonly providerConfig: GeneratedVapiResources;
}
export interface DeploymentResult {
  readonly created: boolean;
  readonly updated: boolean;
  readonly unchanged: boolean;
  readonly assistantId: string;
  readonly deployedAt?: string;
}
export interface DeploymentDryRunResult extends DeploymentResult {
  readonly dryRun: true;
  readonly hash: string;
  readonly configuration: GeneratedVapiResources;
  readonly planned: "create" | "update" | "unchanged" | "unknown";
}
export interface DeployOptions {
  readonly dryRun?: boolean;
}
export interface Vokli {
  readonly version: string;
  readonly knowledge: KnowledgeService;
  validate(agent: unknown): ValidationResult;
  generate(agent: unknown): GeneratedAgent;
  deploy(
    agent: unknown,
    options?: DeployOptions,
  ): Promise<DeploymentResult | DeploymentDryRunResult>;
}
export interface CreateVokliOptions {
  readonly provider?: {
    readonly type: "vapi";
    readonly apiKey?: string;
    readonly timeoutMs?: number;
    readonly client?: VapiApi;
  };
  readonly vapi?: VapiGenerationOptions;
  readonly knowledge?: CreateKnowledgeServiceOptions;
}
const SDK_VERSION = "0.4.0";

export class DeploymentError extends Error {
  readonly operation: string;
  readonly retryable: boolean;
  override readonly cause?: unknown;
  constructor(
    operation: string,
    message: string,
    cause?: unknown,
    retryable = false,
  ) {
    super(message);
    this.name = "DeploymentError";
    this.operation = operation;
    this.retryable = retryable;
    this.cause = cause;
  }
}

export function createVokli(options: CreateVokliOptions = {}): Vokli {
  const cwd = options.knowledge?.cwd ?? process.cwd();
  const statePath =
    options.knowledge?.statePath ?? join(cwd, ".vokli", "state.json");
  const api =
    options.provider?.client ??
    (options.provider?.apiKey
      ? createVapiApi({
          apiKey: options.provider.apiKey,
          ...(options.provider.timeoutMs
            ? { timeoutMs: options.provider.timeoutMs }
            : {}),
        })
      : undefined);
  const knowledgeClient: VapiKnowledgeApi | undefined =
    options.knowledge?.client ?? api;
  const knowledge = createKnowledgeService({
    ...options.knowledge,
    ...(knowledgeClient ? { client: knowledgeClient } : {}),
    statePath,
  });

  const generate = (agent: unknown): GeneratedAgent => {
    const validation = validateAgent(agent);
    if (!validation.success) throw new VokliValidationError(validation.errors);
    if (!options.vapi)
      throw new DeploymentError(
        "generate",
        "Vapi model and voice configuration is required. Pass createVokli({ vapi: { model, voice } }).",
      );
    const providerConfig = generateVapiAssistantConfig(
      validation.data,
      options.vapi,
    );
    return {
      agent: validation.data,
      prompt: generateReceptionistPrompt(validation.data),
      structuredOutputs: providerConfig.structuredOutputs,
      providerConfig,
    };
  };

  return Object.freeze({
    version: SDK_VERSION,
    knowledge,
    validate: validateAgent,
    generate,
    async deploy(
      agent: unknown,
      deployOptions: DeployOptions = {},
    ): Promise<DeploymentResult | DeploymentDryRunResult> {
      const generated = generate(agent);
      const canonical = stableStringify(generated.providerConfig);
      const hash = createHash("sha256").update(canonical).digest("hex");
      const state = await readKnowledgeState(statePath);
      const previous = state.agents[generated.agent.id];
      const planned =
        previous?.deploymentHash === hash
          ? "unchanged"
          : previous?.assistantId
            ? "update"
            : "create";
      if (deployOptions.dryRun)
        return {
          dryRun: true,
          created: false,
          updated: false,
          unchanged: planned === "unchanged",
          assistantId: previous?.assistantId ?? "dry-run:not-created",
          hash,
          configuration: generated.providerConfig,
          planned,
        };
      if (!api)
        throw new DeploymentError(
          "deploy",
          "Vapi authentication is required. Set provider.apiKey or inject provider.client.",
        );
      if (previous?.deploymentHash === hash && previous.assistantId)
        return {
          created: false,
          updated: false,
          unchanged: true,
          assistantId: previous.assistantId,
          ...(previous.deployedAt ? { deployedAt: previous.deployedAt } : {}),
        };
      try {
        let assistantId = previous?.assistantId;
        let created = false;
        if (!assistantId) {
          assistantId = (
            await api.createAssistant(
              generated.providerConfig.assistant as unknown as Record<
                string,
                unknown
              >,
            )
          ).id;
          created = true;
          await writeAgentKnowledgeState(statePath, generated.agent.id, {
            ...previous,
            files: previous?.files ?? {},
            assistantId,
            pending: ["deployment-finalize"],
          });
        } else {
          await api.updateAssistant(
            assistantId,
            generated.providerConfig.assistant as unknown as Record<
              string,
              unknown
            >,
          );
        }
        const deployedAt = (
          options.knowledge?.now ?? (() => new Date())
        )().toISOString();
        await writeAgentKnowledgeState(statePath, generated.agent.id, {
          ...previous,
          files: previous?.files ?? {},
          assistantId,
          deploymentHash: hash,
          deployedAt,
          pending: [],
        });
        return {
          created,
          updated: !created,
          unchanged: false,
          assistantId,
          deployedAt,
        };
      } catch (cause) {
        if (cause instanceof DeploymentError) throw cause;
        const safeCause =
          cause instanceof Error && options.provider?.apiKey
            ? new Error(
                cause.message.replaceAll(options.provider.apiKey, "[REDACTED]"),
              )
            : cause;
        throw new DeploymentError(
          "deploy",
          "Vapi deployment failed. The saved state can be used to retry safely.",
          safeCause,
          typeof cause === "object" &&
            cause !== null &&
            "retryable" in cause &&
            cause.retryable === true,
        );
      }
    },
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
