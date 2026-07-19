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

export interface VapiTranscriberDraft {
  readonly provider: string;
  readonly model: string;
  readonly language: string;
}

export interface VapiVoiceDraft {
  readonly provider: string;
  readonly voiceId: string;
  readonly model?: string | undefined;
}

export interface VapiGenerationOptions {
  readonly model?: Omit<VapiModelDraft, "messages">;
  readonly voice?: VapiVoiceDraft;
  readonly transcriber?: VapiTranscriberDraft;
}

export interface VapiAssistantDraft {
  readonly name: string;
  readonly firstMessage: string;
  readonly model: VapiModelDraft;
  readonly voice: VapiVoiceDraft;
  readonly transcriber?: VapiTranscriberDraft;
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

  const modelConfig = agent.model ?? options.model ?? {
    provider: "openai",
    model: "gpt-5-mini",
  };

  const voiceConfig = agent.voice ?? options.voice ?? {
    provider: "vapi",
    voiceId: "jessica",
  };

  const transcriberConfig = agent.transcriber ?? options.transcriber ?? {
    provider: "soniox",
    model: "stt-rt-v5",
    language: "en",
  };

  return {
    assistant: {
      name: agent.id,
      firstMessage: agent.greeting,
      model: {
        ...modelConfig,
        messages: [
          { role: "system", content: generateReceptionistPrompt(agent) },
        ],
      },
      voice: { ...voiceConfig },
      transcriber: { ...transcriberConfig },
    },
    structuredOutputs: structuredOutput ? [structuredOutput] : [],
  };
}
