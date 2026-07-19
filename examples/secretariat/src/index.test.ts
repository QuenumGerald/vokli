import { describe, it, expect } from "vitest";
import { agent } from "./index.js";
import { createVokli } from "@vokli/sdk";
import { generateReceptionistPrompt } from "@vokli/core";

// ─── Agent Structure ─────────────────────────────────────────────────────────

describe("Agent structure", () => {
  it("has the correct agent id", () => {
    expect(agent.id).toBe("helpdesk-telecom-b2b");
  });

  it("is configured for fr-FR and Paris timezone", () => {
    expect(agent.business.language).toBe("fr-FR");
    expect(agent.business.timezone).toBe("Europe/Paris");
  });

  it("starts with a French greeting", () => {
    expect(agent.greeting).toMatch(/bonjour/i);
  });

  it("uses ElevenLabs voice with multilingual model", () => {
    expect(agent.voice?.provider).toBe("11labs");
    expect(agent.voice?.model).toBe("eleven_multilingual_v2");
  });

  it("uses Soniox transcriber in French", () => {
    expect(agent.transcriber?.provider).toBe("soniox");
    expect(agent.transcriber?.model).toBe("stt-rt-v5");
    expect(agent.transcriber?.language).toBe("fr");
  });

  it("uses gpt-5-mini as LLM", () => {
    expect(agent.model?.provider).toBe("openai");
    expect(agent.model?.model).toBe("gpt-5-mini");
  });
});

// ─── Collect Schema ───────────────────────────────────────────────────────────

describe("Collect schema", () => {
  it("does NOT ask for company name (always Yealink)", () => {
    expect(agent.collect).not.toHaveProperty("companyName");
  });

  it("collects all required technician qualification fields", () => {
    const requiredFields = [
      "contactName",
      "phoneNumber",
      "equipmentType",
      "issueDescription",
      "rebootAttempted",
      "needsTechnician",
    ];
    for (const field of requiredFields) {
      expect(agent.collect[field]?.required).toBe(true);
    }
  });

  it("all collect fields have a label and description", () => {
    for (const [key, field] of Object.entries(agent.collect)) {
      expect(field?.label, `${key}.label`).toBeTruthy();
      expect(field?.description, `${key}.description`).toBeTruthy();
    }
  });
});

// ─── Behaviour Rules ──────────────────────────────────────────────────────────

describe("Behaviour rules", () => {
  it("includes a rule to never repeat a question already answered", () => {
    const hasNoRepeatRule = agent.customRules.some((r) =>
      r.toLowerCase().includes("jamais une question") ||
      r.toLowerCase().includes("déjà répondu")
    );
    expect(hasNoRepeatRule).toBe(true);
  });

  it("includes a rule to close the call once the problem is self-resolved", () => {
    const hasResolveRule = agent.customRules.some((r) =>
      r.toLowerCase().includes("terminez l'appel") ||
      r.toLowerCase().includes("needstechnician")
    );
    expect(hasResolveRule).toBe(true);
  });

  it("includes a rule to collect info one question at a time", () => {
    const hasOneAtATimeRule = agent.customRules.some((r) =>
      r.toLowerCase().includes("une seule question à la fois")
    );
    expect(hasOneAtATimeRule).toBe(true);
  });

  it("includes a rule to never promise an exact intervention time", () => {
    const hasNoExactTimeRule = agent.customRules.some((r) =>
      r.toLowerCase().includes("jamais promettre") ||
      r.toLowerCase().includes("heure exacte")
    );
    expect(hasNoExactTimeRule).toBe(true);
  });

  it("includes a rule to confirm collected info only once", () => {
    const hasConfirmOnceRule = agent.customRules.some((r) =>
      r.toLowerCase().includes("une seule et unique fois")
    );
    expect(hasConfirmOnceRule).toBe(true);
  });
});

// ─── Prompt Generation ────────────────────────────────────────────────────────

describe("System prompt generation", () => {
  let prompt: string;

  it("generates without throwing", () => {
    prompt = generateReceptionistPrompt(agent);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("instructs the agent to speak fr-FR", () => {
    prompt = generateReceptionistPrompt(agent);
    expect(prompt).toContain("fr-FR");
  });

  it("contains the opening hours", () => {
    prompt = generateReceptionistPrompt(agent);
    expect(prompt).toContain("Monday");
    expect(prompt).toContain("08:00-19:00");
  });

  it("lists all collect fields in the system prompt", () => {
    prompt = generateReceptionistPrompt(agent);
    for (const key of Object.keys(agent.collect)) {
      expect(prompt, `collect field ${key} missing from prompt`).toContain(key);
    }
  });

  it("does NOT mention companyName in the prompt", () => {
    prompt = generateReceptionistPrompt(agent);
    expect(prompt).not.toContain("companyName");
    expect(prompt.toLowerCase()).not.toContain("nom de l'entreprise");
  });

  it("includes knowledge base instructions", () => {
    prompt = generateReceptionistPrompt(agent);
    expect(prompt).toContain("Knowledge base");
  });

  it("includes custom rules in the prompt", () => {
    prompt = generateReceptionistPrompt(agent);
    expect(prompt).toContain("Custom rules");
    // Spot check one custom rule keyword
    expect(prompt.toLowerCase()).toContain("technicien");
  });
});

// ─── Vokli Validation ─────────────────────────────────────────────────────────

describe("Vokli validation", () => {
  const vokli = createVokli();

  it("passes schema validation", () => {
    const result = vokli.validate(agent);
    expect(result.success).toBe(true);
  });

  it("generates a valid Vapi assistant config", () => {
    const generated = vokli.generate(agent);
    expect(generated.providerConfig.assistant.name).toBe("helpdesk-telecom-b2b");
    expect(generated.providerConfig.assistant.firstMessage).toMatch(/bonjour/i);
  });

  it("the generated config has the correct voice provider", () => {
    const generated = vokli.generate(agent);
    expect(generated.providerConfig.assistant.voice.provider).toBe("11labs");
  });

  it("the generated config has the correct transcriber provider", () => {
    const generated = vokli.generate(agent);
    expect(generated.providerConfig.assistant.transcriber?.provider).toBe("soniox");
  });

  it("the generated config has the correct LLM model", () => {
    const generated = vokli.generate(agent);
    expect(generated.providerConfig.assistant.model.provider).toBe("openai");
    expect(generated.providerConfig.assistant.model.model).toBe("gpt-5-mini");
  });
});
