import {
  generateReceptionistPrompt,
  generateStructuredOutput,
  type ReceptionistDefinition,
  type StructuredOutputDraft,
} from "@vokli/core";

export interface VapiModelDraft {
  readonly provider: string;
  readonly model: string;
  readonly messages: readonly [
    { readonly role: "system"; readonly content: string },
  ];
}

export interface VapiVoiceDraft {
  readonly provider: string;
  readonly voiceId: string;
}

export interface VapiGenerationOptions {
  readonly model: Omit<VapiModelDraft, "messages">;
  readonly voice: VapiVoiceDraft;
}

export interface VapiAssistantDraft {
  readonly name: string;
  readonly firstMessage: string;
  readonly model: VapiModelDraft;
  readonly voice: VapiVoiceDraft;
}

export interface GeneratedVapiResources {
  readonly assistant: VapiAssistantDraft;
  readonly structuredOutputs: readonly StructuredOutputDraft[];
}

export function generateVapiAssistantConfig(
  agent: ReceptionistDefinition,
  options: VapiGenerationOptions,
): GeneratedVapiResources {
  const structuredOutput = generateStructuredOutput(agent);

  return {
    assistant: {
      name: agent.id,
      firstMessage: agent.greeting,
      model: {
        ...options.model,
        messages: [
          { role: "system", content: generateReceptionistPrompt(agent) },
        ],
      },
      voice: { ...options.voice },
    },
    structuredOutputs: structuredOutput ? [structuredOutput] : [],
  };
}
