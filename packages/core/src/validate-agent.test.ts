import { describe, expect, it } from "vitest";

import { receptionist } from "./receptionist.js";
import { createTestReceptionist } from "./test-agent.js";
import { validateAgent } from "./validate-agent.js";

function issueFor(agent: unknown, path: string) {
  const result = validateAgent(agent);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Expected validation to fail.");
  return result.errors.find((issue) => issue.path === path);
}

describe("validateAgent", () => {
  it("accepts a valid receptionist definition", () => {
    const agent = createTestReceptionist();
    expect(validateAgent(agent)).toEqual({ success: true, data: agent });
  });

  it("rejects an invalid id with a structured issue", () => {
    const agent = { ...createTestReceptionist(), id: "2 Bad ID" };
    expect(issueFor(agent, "id")).toMatchObject({ code: "invalid_string" });
  });

  it("rejects an invalid locale", () => {
    const agent = createTestReceptionist();
    const invalid = {
      ...agent,
      business: { ...agent.business, language: "french" },
    };
    expect(issueFor(invalid, "business.language")?.message).toContain("BCP 47");
  });

  it("rejects an invalid IANA time zone", () => {
    const agent = createTestReceptionist();
    const invalid = {
      ...agent,
      business: { ...agent.business, timezone: "Paris" },
    };
    expect(issueFor(invalid, "business.timezone")?.message).toContain("IANA");
  });

  it("accepts chronological time ranges", () => {
    const agent = receptionist({
      ...createTestReceptionist(),
      business: {
        ...createTestReceptionist().business,
        openingHours: { monday: ["08:00-12:00", "14:00-18:00"] },
      },
    });
    expect(validateAgent(agent).success).toBe(true);
  });

  it("rejects invalid time values and reversed ranges", () => {
    const agent = createTestReceptionist();
    const invalid = {
      ...agent,
      business: {
        ...agent.business,
        openingHours: { monday: ["25:00-12:00"] },
      },
    };
    expect(
      issueFor(invalid, "business.openingHours.monday[0]")?.message,
    ).toContain("HH:mm-HH:mm");
  });

  it("rejects overlapping or unordered ranges", () => {
    const agent = createTestReceptionist();
    const invalid = {
      ...agent,
      business: {
        ...agent.business,
        openingHours: { monday: ["10:00-14:00", "13:00-17:00"] },
      },
    };
    expect(
      issueFor(invalid, "business.openingHours.monday[1]")?.message,
    ).toContain("must not overlap");
  });
});
