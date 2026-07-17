import { describe, expect, it } from "vitest";

import { createTestReceptionist } from "./test-agent.js";
import { generateStructuredOutput } from "./structured-output.js";

describe("generateStructuredOutput", () => {
  it("converts collection fields to a closed JSON schema", () => {
    const output = generateStructuredOutput(createTestReceptionist());

    expect(output?.schema.additionalProperties).toBe(false);
    expect(output?.schema.properties).toEqual({
      callerName: { type: "string", description: "The caller's full name" },
      quantity: { type: "number", description: "The requested quantity" },
      urgent: { type: "boolean", description: "Whether the request is urgent" },
    });
    expect(output?.schema.required).toEqual(["callerName"]);
  });

  it("returns no draft when nothing is collected", () => {
    expect(
      generateStructuredOutput({ ...createTestReceptionist(), collect: {} }),
    ).toBeUndefined();
  });
});
