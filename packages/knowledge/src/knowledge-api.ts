export interface VapiFileUpload {
  readonly path: string;
  readonly fileName: string;
  readonly content: Uint8Array;
}

export interface VapiKnowledgeApi {
  uploadFile(file: VapiFileUpload): Promise<{ readonly id: string }>;
  createKnowledgeBase(input: {
    readonly name: string;
    readonly fileIds: readonly string[];
  }): Promise<{ readonly id: string }>;
  updateKnowledgeBase(
    knowledgeBaseId: string,
    input: { readonly fileIds: readonly string[] },
  ): Promise<void>;
  attachKnowledgeBaseToAssistant(
    assistantId: string,
    knowledgeBaseId: string,
  ): Promise<void>;
}
