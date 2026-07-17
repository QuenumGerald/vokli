import type { ReceptionistDefinition } from "./agent-definition.js";
import type { CollectionFieldType } from "./collection-field.js";

export interface JsonSchemaProperty {
  readonly type: CollectionFieldType;
  readonly description: string;
}

export interface ObjectJsonSchema {
  readonly type: "object";
  readonly additionalProperties: false;
  readonly properties: Readonly<Record<string, JsonSchemaProperty>>;
  readonly required: readonly string[];
}

export interface StructuredOutputDraft {
  readonly name: string;
  readonly description: string;
  readonly schema: ObjectJsonSchema;
}

export function generateStructuredOutput(
  agent: ReceptionistDefinition,
): StructuredOutputDraft | undefined {
  const fieldNames = Object.keys(agent.collect).sort();
  if (fieldNames.length === 0) return undefined;

  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const fieldName of fieldNames) {
    const field = agent.collect[fieldName];
    if (!field) continue;
    properties[fieldName] = {
      type: field.type,
      description: field.description,
    };
    if (field.required) required.push(fieldName);
  }

  return {
    name: `${agent.id}-call-data`,
    description: `Information collected during calls handled by ${agent.business.name}.`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties,
      required,
    },
  };
}
