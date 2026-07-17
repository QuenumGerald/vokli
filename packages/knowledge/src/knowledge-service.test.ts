import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { receptionist } from "@vokli/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VapiKnowledgeApi } from "./knowledge-api.js";
import {
  createKnowledgeService,
  KnowledgeSyncError,
} from "./knowledge-service.js";
import { vapiKnowledge } from "./vapi-knowledge.js";

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "vokli-knowledge-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function createAgent(sources: readonly string[], assistantId = "assistant-1") {
  return receptionist({
    id: "sample-business",
    business: {
      name: "Sample Business",
      language: "en-US",
      timezone: "America/New_York",
    },
    greeting: "Hello, how may I help?",
    knowledge: vapiKnowledge({ sources, assistantId }),
  });
}

function createClient(): VapiKnowledgeApi {
  let fileNumber = 0;
  return {
    uploadFile: vi.fn(async () => ({ id: `file-${++fileNumber}` })),
    createKnowledgeBase: vi.fn(async () => ({ id: "kb-1" })),
    updateKnowledgeBase: vi.fn(async () => undefined),
    attachKnowledgeBaseToAssistant: vi.fn(async () => undefined),
  };
}

describe("knowledge file validation", () => {
  it("discovers files and produces stable SHA-256 hashes", async () => {
    await writeFile(join(directory, "faq.md"), "Stable FAQ content");
    const service = createKnowledgeService({ cwd: directory });
    const agent = createAgent(["faq.md"]);

    const first = await service.validate(agent);
    const second = await service.validate(agent);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      success: true,
      files: [{ source: "faq.md", change: "new" }],
    });
    if (first.success) expect(first.files[0]?.hash).toHaveLength(64);
  });

  it("reports missing files and unsupported extensions", async () => {
    await writeFile(join(directory, "secrets.exe"), "not supported");
    const validation = await createKnowledgeService({
      cwd: directory,
    }).validate(createAgent(["missing.md", "secrets.exe"]));

    expect(validation).toMatchObject({
      success: false,
      errors: [
        { path: "missing.md", code: "file_not_found" },
        { path: "secrets.exe", code: "unsupported_extension" },
      ],
    });
  });
});

describe("knowledge synchronization", () => {
  it("uploads incrementally, updates the knowledge base, and persists metadata only", async () => {
    const sourcePath = join(directory, "services.md");
    await writeFile(sourcePath, "Original services");
    const client = createClient();
    const service = createKnowledgeService({
      client,
      cwd: directory,
      now: () => new Date("2026-07-17T12:00:00.000Z"),
    });
    const agent = createAgent(["services.md"]);

    const first = await service.sync(agent);
    const unchanged = await service.sync(agent);
    await writeFile(sourcePath, "Modified services");
    const beforeUpdate = await service.status(agent);
    const modified = await service.sync(agent);

    expect(first.uploadedFiles).toBe(1);
    expect(unchanged.uploadedFiles).toBe(0);
    expect(beforeUpdate.files[0]?.change).toBe("modified");
    expect(modified.uploadedFiles).toBe(1);
    expect(client.uploadFile).toHaveBeenCalledTimes(2);
    expect(client.createKnowledgeBase).toHaveBeenCalledTimes(1);
    expect(client.updateKnowledgeBase).toHaveBeenCalledTimes(1);
    expect(client.attachKnowledgeBaseToAssistant).toHaveBeenCalledTimes(1);

    const state = await readFile(
      join(directory, ".vokli", "state.json"),
      "utf8",
    );
    expect(state).toContain('"knowledgeBaseId": "kb-1"');
    expect(state).toContain('"vapiFileId": "file-2"');
    expect(state).toContain('"lastSyncedAt": "2026-07-17T12:00:00.000Z"');
    expect(state).not.toContain("Modified services");
  });

  it("fails clearly when no API client is configured", async () => {
    await writeFile(join(directory, "faq.pdf"), "PDF placeholder");
    const service = createKnowledgeService({ cwd: directory });

    await expect(service.sync(createAgent(["faq.pdf"]))).rejects.toThrow(
      KnowledgeSyncError,
    );
  });

  it("retries a failed knowledge-base update without uploading the file again", async () => {
    const sourcePath = join(directory, "faq.md");
    await writeFile(sourcePath, "First version");
    const client = createClient();
    const service = createKnowledgeService({ client, cwd: directory });
    const agent = createAgent(["faq.md"]);
    await service.sync(agent);

    await writeFile(sourcePath, "Second version");
    vi.mocked(client.updateKnowledgeBase).mockRejectedValueOnce(
      new Error("Temporary Vapi failure"),
    );
    await expect(service.sync(agent)).rejects.toThrow("Temporary Vapi failure");
    const recovered = await service.sync(agent);

    expect(recovered.uploadedFiles).toBe(0);
    expect(client.uploadFile).toHaveBeenCalledTimes(2);
    expect(client.updateKnowledgeBase).toHaveBeenCalledTimes(2);
  });
});
