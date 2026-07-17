import type { BusinessDefinition } from "./business-definition.js";
import type { CollectionDefinition } from "./collection-field.js";
import type { VapiKnowledgeProvider } from "./knowledge-provider.js";

export interface ReceptionistDefinition {
  readonly kind: "receptionist";
  readonly id: string;
  readonly business: BusinessDefinition;
  readonly greeting: string;
  readonly collect: CollectionDefinition;
  readonly responsibilities: readonly string[];
  readonly conversationRules: readonly string[];
  readonly safetyRules: readonly string[];
  readonly customRules: readonly string[];
  readonly knowledge?: VapiKnowledgeProvider | undefined;
}

export type AgentDefinition = ReceptionistDefinition;

export interface ReceptionistInput {
  readonly id: string;
  readonly business: BusinessDefinition;
  readonly greeting: string;
  readonly collect?: CollectionDefinition | undefined;
  readonly rules?: readonly string[] | undefined;
  readonly knowledge?: VapiKnowledgeProvider | undefined;
}
