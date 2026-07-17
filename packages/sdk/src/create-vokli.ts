import {
  generateReceptionistPrompt,
  validateAgent,
  type AgentDefinition,
  type StructuredOutputDraft,
  type ValidationResult,
} from "@vokli/core";
import {
  generateVapiAssistantConfig,
  type GeneratedVapiResources,
  type VapiGenerationOptions,
} from "@vokli/vapi";
import {
  createKnowledgeService,
  type CreateKnowledgeServiceOptions,
  type KnowledgeService,
} from "@vokli/knowledge";

import { VokliValidationError } from "./vokli-validation-error.js";

export interface GeneratedAgent {
  readonly agent: AgentDefinition;
  readonly prompt: string;
  readonly structuredOutputs: readonly StructuredOutputDraft[];
  readonly providerConfig: GeneratedVapiResources;
}

export interface Vokli {
  readonly version: string;
  readonly knowledge: KnowledgeService;
  validate(agent: unknown): ValidationResult;
  generate(agent: unknown): GeneratedAgent;
}

export interface CreateVokliOptions {
  readonly vapi: VapiGenerationOptions;
  readonly knowledge?: CreateKnowledgeServiceOptions;
}

const SDK_VERSION = "0.4.0";

export function createVokli(options: CreateVokliOptions): Vokli {
  const vapiOptions: VapiGenerationOptions = {
    model: { ...options.vapi.model },
    voice: { ...options.vapi.voice },
  };
  const knowledge = createKnowledgeService(options.knowledge);

  return Object.freeze({
    version: SDK_VERSION,
    knowledge,
    validate: validateAgent,
    generate(agent: unknown): GeneratedAgent {
      const validation = validateAgent(agent);
      if (!validation.success) {
        throw new VokliValidationError(validation.errors);
      }

      const validatedAgent = validation.data;
      const prompt = generateReceptionistPrompt(validatedAgent);
      const providerConfig = generateVapiAssistantConfig(
        validatedAgent,
        vapiOptions,
      );

      return {
        agent: validatedAgent,
        prompt,
        structuredOutputs: providerConfig.structuredOutputs,
        providerConfig,
      };
    },
  });
}
