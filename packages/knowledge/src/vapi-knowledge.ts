import type { VapiKnowledgeProvider } from "../../core/dist/index.js";

export interface VapiKnowledgeOptions {
  readonly sources: readonly string[];
  readonly assistantId?: string;
}

export function vapiKnowledge(
  options: VapiKnowledgeOptions,
): VapiKnowledgeProvider {
  return {
    type: "vapi",
    sources: [...options.sources],
    ...(options.assistantId ? { assistantId: options.assistantId } : {}),
  };
}
