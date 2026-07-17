import { describe, expect, it } from "vitest";

import { receptionist } from "./receptionist.js";
import { createTestReceptionist } from "./test-agent.js";

describe("receptionist", () => {
  it("creates an explicit definition with default and custom rules", () => {
    const agent = createTestReceptionist();

    expect(agent.kind).toBe("receptionist");
    expect(agent.safetyRules).toContain(
      "Never claim an action succeeded unless a configured tool confirms it.",
    );
    expect(agent.customRules).toEqual(["Do not quote a price."]);
  });

  it("does not mutate input arrays", () => {
    const rules = ["Keep this rule."];
    const agent = receptionist({ ...createTestReceptionist(), rules });
    rules.push("Added later.");
    expect(agent.customRules).toEqual(["Keep this rule."]);
  });
});
