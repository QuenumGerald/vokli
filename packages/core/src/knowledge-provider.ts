export interface KnowledgeProvider {
  readonly type: string;
  readonly id?: string | undefined;
  readonly description?: string | undefined;
}

export interface VapiKnowledgeProvider extends KnowledgeProvider {
  readonly type: "vapi";
  readonly sources: readonly string[];
  readonly assistantId?: string | undefined;
}
