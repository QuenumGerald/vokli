export type CollectionFieldType = "boolean" | "number" | "string";

export interface CollectionField {
  readonly label: string;
  readonly description: string;
  readonly type: CollectionFieldType;
  readonly required: boolean;
}

export type CollectionDefinition = Readonly<Record<string, CollectionField>>;
