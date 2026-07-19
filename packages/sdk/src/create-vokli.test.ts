import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { VapiApi } from "@vokli/vapi";

import { createVokli, agent, VokliValidationError } from "./index.js";

const options = {
  vapi: {
    model: { provider: "configured-provider", model: "configured-model" },
    voice: { provider: "configured-provider", voiceId: "configured-voice" },
  },
};

const validAgent = agent({
  id: "sample-business",
  business: {
    name: "Sample Business",
    language: "en-US",
    timezone: "America/New_York",
  },
  greeting: "Hello, how may I help?",
});

describe("createVokli", () => {
  it("supports local validation and generation without options using default values", () => {
    expect(createVokli().validate(validAgent).success).toBe(true);
    const generated = createVokli().generate(validAgent);
    expect(generated.providerConfig.assistant.model.provider).toBe("openai");
    expect(generated.providerConfig.assistant.voice.provider).toBe("vapi");
  });

  it("creates, skips, and updates an assistant using state identity", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vokli-deploy-"));
    const client = createApi();
    const vokli = createVokli({
      ...options,
      provider: { type: "vapi", client },
      knowledge: { cwd: directory },
    });
    const created = await vokli.deploy(validAgent);
    const unchanged = await vokli.deploy(validAgent);
    const updated = await vokli.deploy({
      ...validAgent,
      greeting: "A changed greeting",
    });
    expect(created).toMatchObject({
      created: true,
      assistantId: "assistant-1",
    });
    expect(unchanged).toMatchObject({ unchanged: true });
    expect(updated).toMatchObject({
      updated: true,
      assistantId: "assistant-1",
    });
    expect(client.createAssistant).toHaveBeenCalledTimes(1);
    expect(client.updateAssistant).toHaveBeenCalledTimes(1);
  });

  it("dry-runs without a key, HTTP, or state write", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vokli-dry-"));
    const result = await createVokli({
      ...options,
      knowledge: { cwd: directory },
    }).deploy(validAgent, { dryRun: true });
    expect(result).toMatchObject({
      dryRun: true,
      planned: "create",
      created: false,
    });
    expect(result).not.toHaveProperty("assistantId");
    await expect(
      readFile(join(directory, ".vokli", "state.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("creates an immutable instance with validation and generation", () => {
    const vokli = createVokli(options);

    expect(vokli.version).toBe("0.4.0");
    expect(Object.isFrozen(vokli)).toBe(true);
    expect(vokli.validate(validAgent)).toEqual({
      success: true,
      data: validAgent,
    });
    expect(
      vokli.generate(validAgent).providerConfig.assistant.firstMessage,
    ).toBe(validAgent.greeting);
  });

  it("returns structured validation errors without throwing", () => {
    const validation = createVokli(options).validate({
      ...validAgent,
      id: "INVALID",
    });

    expect(validation).toMatchObject({
      success: false,
      errors: [{ path: "id", code: "invalid_string" }],
    });
  });

  it("throws one clear Vokli error when generation input is invalid", () => {
    const vokli = createVokli(options);

    expect(() => vokli.generate({ ...validAgent, id: "INVALID" })).toThrow(
      VokliValidationError,
    );
    try {
      vokli.generate({ ...validAgent, id: "INVALID" });
    } catch (error) {
      expect(error).toMatchObject({
        name: "VokliValidationError",
        issues: [{ path: "id" }],
      });
    }
  });
});

function createApi(): VapiApi {
  return {
    createAssistant: vi.fn(async () => ({ id: "assistant-1" })),
    getAssistant: vi.fn(async (id) => ({ id, model: {} })),
    updateAssistant: vi.fn(async (id) => ({ id })),
    uploadFile: vi.fn(async () => ({ id: "file-1" })),
    createQueryTool: vi.fn(async () => ({ id: "tool-1" })),
    updateQueryTool: vi.fn(async () => undefined),
    attachQueryToolToAssistant: vi.fn(async () => undefined),
  };
}
