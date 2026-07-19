import type {
  ReceptionistDefinition,
  ReceptionistInput,
} from "./agent-definition.js";
import {
  RECEPTIONIST_CONVERSATION_RULES,
  RECEPTIONIST_RESPONSIBILITIES,
  RECEPTIONIST_SAFETY_RULES,
} from "./receptionist-rules.js";

export function agent(input: ReceptionistInput): ReceptionistDefinition {
  return {
    kind: "receptionist",
    id: input.id,
    business: { ...input.business },
    greeting: input.greeting,
    collect: { ...input.collect },
    responsibilities: [...RECEPTIONIST_RESPONSIBILITIES],
    conversationRules: [...RECEPTIONIST_CONVERSATION_RULES],
    safetyRules: [...RECEPTIONIST_SAFETY_RULES],
    customRules: [...(input.rules ?? [])],
    ...(input.knowledge
      ? {
          knowledge: {
            ...input.knowledge,
            sources: [...input.knowledge.sources],
          },
        }
      : {}),
    ...(input.model ? { model: { ...input.model } } : {}),
    ...(input.voice ? { voice: { ...input.voice } } : {}),
    ...(input.transcriber ? { transcriber: { ...input.transcriber } } : {}),
  };
}
