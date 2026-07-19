import type { ValidationIssue } from "../../core/dist/index.js";

export class VokliValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(
      `Agent definition is invalid (${issues.length} validation issue${issues.length === 1 ? "" : "s"}).`,
    );
    this.name = "VokliValidationError";
    this.issues = issues;
  }
}
