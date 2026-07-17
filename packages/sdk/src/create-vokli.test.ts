import { describe, expect, it } from "vitest";

import { createVokli, receptionist, VokliValidationError } from "./index.js";

const options = {
  vapi: {
    model: { provider: "configured-provider", model: "configured-model" },
    voice: { provider: "configured-provider", voiceId: "configured-voice" },
  },
};

const validAgent = receptionist({
  id: "sample-business",
  business: {
    name: "Sample Business",
    language: "en-US",
    timezone: "America/New_York",
  },
  greeting: "Hello, how may I help?",
});

describe("createVokli", () => {
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
