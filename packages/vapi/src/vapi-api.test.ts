import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  class MockVapiError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return {
    constructor: vi.fn(),
    assistants: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
    },
    files: { create: vi.fn() },
    tools: { create: vi.fn(), update: vi.fn() },
    MockVapiError,
  };
});

vi.mock("@vapi-ai/server-sdk", () => ({
  VapiError: sdk.MockVapiError,
  VapiClient: class {
    readonly assistants = sdk.assistants;
    readonly files = sdk.files;
    readonly tools = sdk.tools;
    constructor(options: unknown) {
      sdk.constructor(options);
    }
  },
}));

import { createVapiApi } from "./vapi-api.js";
import type { ProviderError } from "./vapi-api.js";

describe("createVapiApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.assistants.create.mockResolvedValue({ id: "assistant-1" });
    sdk.assistants.get.mockResolvedValue({ id: "assistant-1", model: {} });
    sdk.assistants.update.mockResolvedValue({ id: "assistant-1" });
    sdk.files.create.mockResolvedValue({ id: "file-1" });
    sdk.tools.create.mockResolvedValue({ id: "tool-1" });
    sdk.tools.update.mockResolvedValue(undefined);
  });

  it("applies provider.timeoutMs to every Vapi request through the client", async () => {
    const api = createVapiApi({ apiKey: "secret", timeoutMs: 2_500 });

    await api.createAssistant({ name: "Reception" });
    await api.getAssistant("assistant-1");
    await api.updateAssistant("assistant-1", { name: "Updated" });
    await api.uploadFile({
      path: new URL("../../../package.json", import.meta.url).pathname,
      fileName: "document.txt",
      content: new Uint8Array(),
    });
    await api.createQueryTool({ name: "Knowledge", fileIds: ["file-1"] });
    await api.updateQueryTool("tool-1", {
      name: "Knowledge",
      fileIds: ["file-1"],
    });
    await api.attachQueryToolToAssistant("assistant-1", "tool-1");

    expect(sdk.constructor).toHaveBeenCalledWith({
      token: "secret",
      timeoutInSeconds: 2.5,
    });
    expect(sdk.assistants.create).toHaveBeenCalledOnce();
    expect(sdk.files.create).toHaveBeenCalledOnce();
    expect(sdk.tools.create).toHaveBeenCalledOnce();
    expect(sdk.tools.update).toHaveBeenCalledOnce();
    expect(sdk.assistants.update).toHaveBeenCalledTimes(2);
  });

  it("normalizes HTTP failures without leaking the API key", async () => {
    sdk.assistants.create.mockRejectedValue(
      new sdk.MockVapiError("request with secret failed", 503),
    );
    const api = createVapiApi({ apiKey: "secret" });

    await expect(api.createAssistant({})).rejects.toMatchObject({
      name: "ProviderError",
      operation: "create assistant",
      status: 503,
      retryable: true,
      cause: expect.objectContaining({
        message: expect.stringContaining("request with [REDACTED] failed"),
      }),
    });
  });

  it("marks timeout failures as retryable", async () => {
    sdk.files.create.mockRejectedValue(new Error("Request timed out"));
    const api = createVapiApi({ apiKey: "secret", timeoutMs: 10 });

    await expect(
      api.uploadFile({
        path: new URL("../../../package.json", import.meta.url).pathname,
        fileName: "package.json",
        content: new Uint8Array(),
      }),
    ).rejects.toMatchObject({
      name: "ProviderError",
      operation: "upload file",
      status: undefined,
      retryable: true,
    });
  });

  it("reports an assistant-not-found response as a non-retryable provider error", async () => {
    sdk.assistants.get.mockRejectedValue(
      new sdk.MockVapiError("Assistant not found", 404),
    );
    const api = createVapiApi({ apiKey: "secret" });

    await expect(api.getAssistant("missing")).rejects.toEqual(
      expect.objectContaining<Partial<ProviderError>>({
        name: "ProviderError",
        operation: "get assistant",
        status: 404,
        retryable: false,
      }),
    );
  });
});
