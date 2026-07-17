export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}
