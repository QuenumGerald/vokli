import { describe, expect, it } from "vitest";

import { generateReceptionistPrompt } from "./generate-receptionist-prompt.js";
import { agent } from "./receptionist.js";
import { createTestReceptionist } from "./test-agent.js";

describe("generateReceptionistPrompt", () => {
  it("is deterministic and renders hours in weekday order", () => {
    const agent = createTestReceptionist();
    const first = generateReceptionistPrompt(agent);
    const second = generateReceptionistPrompt(agent);

    expect(first).toBe(second);
    expect(first).toContain("- Monday: 08:00-12:00, 13:00-17:00");
  });

  it("contains default safety rules and custom rules", () => {
    const prompt = generateReceptionistPrompt(createTestReceptionist());
    expect(prompt).toContain("# Safety rules");
    expect(prompt).toContain("No tools are configured");
    expect(prompt).toContain("# Custom rules\n- Do not quote a price.");
  });

  it("omits optional empty sections", () => {
    const base = createTestReceptionist();
    const definition = agent({
      id: base.id,
      business: {
        name: base.business.name,
        language: base.business.language,
        timezone: base.business.timezone,
      },
      greeting: base.greeting,
    });
    const prompt = generateReceptionistPrompt(definition);

    expect(prompt).not.toContain("# Opening hours");
    expect(prompt).not.toContain("# Information to collect");
    expect(prompt).not.toContain("# Custom rules");
  });
});

describe("agent knowledge prompt", () => {
  it("separates static knowledge from real-time tool data", () => {
    const agent = {
      ...createTestReceptionist(),
      knowledge: {
        type: "vapi" as const,
        sources: ["knowledge/faq.md"],
      },
    };
    const prompt = generateReceptionistPrompt(agent);

    expect(prompt).toContain("# Knowledge base");
    expect(prompt).toContain("FAQs, services, warranties, procedures");
    expect(prompt).toContain(
      "prices, stock, and CRM data as real-time information",
    );
    expect(prompt).toContain("Never use knowledge-base content to claim");
  });
});
