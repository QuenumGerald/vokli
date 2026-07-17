import type { OpeningHours } from "./opening-hours.js";

export interface BusinessDefinition {
  readonly name: string;
  readonly description?: string | undefined;
  readonly language: string;
  readonly timezone: string;
  readonly openingHours?: OpeningHours | undefined;
}
