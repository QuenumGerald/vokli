
import { VapiClient, VapiError, type Vapi } from "@vapi-ai/server-sdk";

export interface AssistantSnapshot {
  readonly id: string;
  readonly model?: Readonly<Record<string, unknown>>;
}
export interface VapiApi {
  createAssistant(
    input: Readonly<Record<string, unknown>>,
  ): Promise<AssistantSnapshot>;
  getAssistant(id: string): Promise<AssistantSnapshot>;
  updateAssistant(
    id: string,
    input: Readonly<Record<string, unknown>>,
  ): Promise<AssistantSnapshot>;
  uploadFile(input: {
    readonly path: string;
    readonly fileName: string;
    readonly content: Uint8Array;
  }): Promise<{ readonly id: string }>;
  createQueryTool(input: {
    readonly name: string;
    readonly fileIds: readonly string[];
  }): Promise<{ readonly id: string }>;
  updateQueryTool(
    id: string,
    input: { readonly name: string; readonly fileIds: readonly string[] },
  ): Promise<void>;
  attachQueryToolToAssistant(
    assistantId: string,
    toolId: string,
  ): Promise<void>;
}

export class ProviderError extends Error {
  readonly operation: string;
  readonly status: number | undefined;
  readonly retryable: boolean;
  override readonly cause?: unknown;
  constructor(
    operation: string,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "ProviderError";
    this.operation = operation;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

export function createVapiApi(options: {
  apiKey: string;
  timeoutMs?: number;
}): VapiApi {
  const request = { timeoutInSeconds: (options.timeoutMs ?? 60_000) / 1000 };
  // Configure the client rather than selected requests so the same timeout also
  // covers assistant creation/updates, file uploads, and Query Tool mutations.
  const client = new VapiClient({ token: options.apiKey, ...request });
  const run = async <T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await action();
    } catch (cause) {
      const status = cause instanceof VapiError ? cause.statusCode : undefined;
      const timeout =
        cause instanceof Error &&
        /timeout|timed out|abort/i.test(cause.message);
      throw new ProviderError(
        operation,
        `Vapi ${operation} failed${status ? ` (HTTP ${status})` : ""}. Check credentials, configuration, and retry when appropriate.`,
        {
          ...(status ? { status } : {}),
          retryable:
            timeout ||
            status === 408 ||
            status === 429 ||
            (status !== undefined && status >= 500),
          cause:
            cause instanceof VapiError
              ? new Error(
                  `VapiError (status=${cause.statusCode}): ${JSON.stringify(cause.body || cause.message)}`.replaceAll(options.apiKey, "[REDACTED]")
                )
              : cause instanceof Error
                ? new Error(
                    cause.message.replaceAll(options.apiKey, "[REDACTED]"),
                  )
                : undefined,
        },
      );
    }
  };
  const knowledgeBases = (input: {
    name: string;
    fileIds: readonly string[];
  }): Vapi.KnowledgeBase[] => [
    {
      name: input.name,
      provider: "google",
      description: `Vokli documents for ${input.name}`,
      fileIds: [...input.fileIds],
    },
  ];
  return {
    createAssistant: (input) =>
      run(
        "create assistant",
        () =>
          client.assistants.create(
            input as Vapi.CreateAssistantDto,
          ) as unknown as Promise<AssistantSnapshot>,
      ),
    getAssistant: (id) =>
      run(
        "get assistant",
        () =>
          client.assistants.get({
            id,
          }) as unknown as Promise<AssistantSnapshot>,
      ),
    updateAssistant: (id, input) =>
      run(
        "update assistant",
        () =>
          client.assistants.update({
            id,
            ...input,
          }) as unknown as Promise<AssistantSnapshot>,
      ),
    uploadFile: (input) =>
      run(
        "upload file",
        () =>
          client.files.create({
            file: {
              data: input.content,
              filename: input.fileName,
              contentType: getMimeType(input.fileName),
            },
          }) as Promise<{ id: string }>,
      ),
    createQueryTool: (input) =>
      run(
        "create query tool",
        () =>
          client.tools.create({
            type: "query",
            knowledgeBases: knowledgeBases(input),
          }) as Promise<{ id: string }>,
      ),
    updateQueryTool: (id, input) =>
      run("update query tool", async () => {
        await client.tools.update({
          id,
          body: { type: "query", knowledgeBases: knowledgeBases(input) },
        });
      }),
    attachQueryToolToAssistant: (assistantId, toolId) =>
      run("attach query tool", async () => {
        const assistant = await client.assistants.get(
          { id: assistantId },
          request,
        );
        if (!assistant.model)
          throw new Error("The remote assistant has no model to update.");
        const model = assistant.model as unknown as Record<string, unknown>;
        const existing = Array.isArray(model.toolIds)
          ? model.toolIds.filter((id): id is string => typeof id === "string")
          : [];
        await client.assistants.update(
          {
            id: assistantId,
            model: { ...model, toolIds: [...new Set([...existing, toolId])] },
          } as Vapi.UpdateAssistantDto,
          request,
        );
      }),
  };
}

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

