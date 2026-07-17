export interface VapiFileUpload {
  readonly path: string;
  readonly fileName: string;
  readonly content: Uint8Array;
}

export interface VapiAssistantSnapshot {
  readonly id: string;
  readonly model?: Readonly<Record<string, unknown>>;
}

/** Provider boundary shared by deployment and knowledge synchronization. */
export interface VapiKnowledgeApi {
  uploadFile(file: VapiFileUpload): Promise<{ readonly id: string }>;
  createQueryTool?(input: {
    readonly name: string;
    readonly fileIds: readonly string[];
  }): Promise<{ readonly id: string }>;
  updateQueryTool?(
    toolId: string,
    input: { readonly name: string; readonly fileIds: readonly string[] },
  ): Promise<void>;
  getAssistant?(assistantId: string): Promise<VapiAssistantSnapshot>;
  attachQueryToolToAssistant?(
    assistantId: string,
    toolId: string,
  ): Promise<void>;
  /** @deprecated Implement Query Tool methods instead. */
  createKnowledgeBase?(input: {
    readonly name: string;
    readonly fileIds: readonly string[];
  }): Promise<{ readonly id: string }>;
  /** @deprecated Implement Query Tool methods instead. */
  updateKnowledgeBase?(
    id: string,
    input: { readonly fileIds: readonly string[] },
  ): Promise<void>;
  /** @deprecated Implement Query Tool methods instead. */
  attachKnowledgeBaseToAssistant?(
    assistantId: string,
    id: string,
  ): Promise<void>;
}
