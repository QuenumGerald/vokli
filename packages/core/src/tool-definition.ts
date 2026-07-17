import type { CollectionDefinition } from "./collection-field.js";

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters?: CollectionDefinition;
}
