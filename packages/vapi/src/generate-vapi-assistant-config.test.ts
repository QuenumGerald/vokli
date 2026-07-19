import { agent } from "@vokli/core";
import { describe, expect, it, vi } from "vitest";

import { generateVapiAssistantConfig } from "./generate-vapi-assistant-config.js";

const definition = agent({
  id: "sample-business",
  business: {
    name: "Sample Business",
    language: "en-US",
    timezone: "America/New_York",
  },
  greeting: "Hello, how may I help?",
  collect: {
    callerName: {
      label: "Caller name",
      description: "Full name",
      type: "string",
      required: true,
    },
  },
});

const options = {
  model: { provider: "configured-provider", model: "configured-model" },
  voice: { provider: "configured-provider", voiceId: "configured-voice" },
};

describe("generateVapiAssistantConfig", () => {
  it("creates separate local assistant and structured-output drafts", () => {
    const resources = generateVapiAssistantConfig(definition, options);

    expect(resources.assistant).toMatchObject({
      name: "sample-business",
      firstMessage: definition.greeting,
      model: options.model,
      voice: options.voice,
    });
    expect(resources.assistant.model.messages[0].content).toContain(
      "# Identity",
    );
    expect(resources.structuredOutputs[0]?.name).toBe(
      "sample-business-call-data",
    );
    expect(resources).not.toHaveProperty("id");
  });

  it("is pure and makes no network request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const first = generateVapiAssistantConfig(definition, options);
    const second = generateVapiAssistantConfig(definition, options);

    expect(second).toEqual(first);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
