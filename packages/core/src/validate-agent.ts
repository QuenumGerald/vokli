import { z } from "zod";

import type { AgentDefinition } from "./agent-definition.js";
import { parseTimeRange, WEEKDAYS } from "./opening-hours.js";
import {
  RECEPTIONIST_CONVERSATION_RULES,
  RECEPTIONIST_RESPONSIBILITIES,
  RECEPTIONIST_SAFETY_RULES,
} from "./receptionist-rules.js";
import type { ValidationIssue } from "./validation-issue.js";

export type ValidationResult =
  | { readonly success: true; readonly data: AgentDefinition }
  | { readonly success: false; readonly errors: readonly ValidationIssue[] };

const requiredText = z.string().trim().min(1, "Expected a non-empty string.");
const collectionFieldSchema = z.object({
  label: requiredText,
  description: requiredText,
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean(),
});

const openingHoursSchema = z
  .object({
    monday: z.array(z.string()).optional(),
    tuesday: z.array(z.string()).optional(),
    wednesday: z.array(z.string()).optional(),
    thursday: z.array(z.string()).optional(),
    friday: z.array(z.string()).optional(),
    saturday: z.array(z.string()).optional(),
    sunday: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((openingHours, context) => {
    for (const day of WEEKDAYS) {
      const ranges = openingHours[day] ?? [];
      let previousEnd = -1;

      ranges.forEach((range, index) => {
        const parsed = parseTimeRange(range);
        if (!parsed) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [day, index],
            message:
              "Expected a valid time range formatted as HH:mm-HH:mm with the end after the start.",
          });
          return;
        }
        if (parsed.startMinutes < previousEnd) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [day, index],
            message: "Time ranges must be chronological and must not overlap.",
          });
        }
        previousEnd = parsed.endMinutes;
      });
    }
  });

const timeZoneSchema = requiredText.refine(isValidTimeZone, {
  message: "Expected a valid IANA time zone, such as Europe/Paris.",
});

const receptionistSchema: z.ZodType<AgentDefinition> = z.object({
  kind: z.literal("receptionist"),
  id: z
    .string()
    .min(3)
    .max(64)
    .regex(
      /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
      "Expected 3-64 lowercase letters, numbers, or hyphens, starting with a letter.",
    ),
  business: z.object({
    name: requiredText,
    description: requiredText.optional(),
    language: z
      .string()
      .regex(
        /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-\d{3})?$/,
        "Expected a common BCP 47 locale, such as fr-FR or en-US.",
      ),
    timezone: timeZoneSchema,
    openingHours: openingHoursSchema.optional(),
  }),
  greeting: requiredText,
  collect: z.record(
    z.string().regex(/^[a-z][A-Za-z0-9]*$/, "Expected a camelCase field name."),
    collectionFieldSchema,
  ),
  responsibilities: requiredRulesSchema(
    RECEPTIONIST_RESPONSIBILITIES,
    "Expected the default agent responsibilities.",
  ),
  conversationRules: requiredRulesSchema(
    RECEPTIONIST_CONVERSATION_RULES,
    "Expected the default agent conversation rules.",
  ),
  safetyRules: requiredRulesSchema(
    RECEPTIONIST_SAFETY_RULES,
    "Expected the default agent safety rules.",
  ),
  customRules: z.array(requiredText),
  knowledge: z
    .object({
      type: z.literal("vapi"),
      sources: z
        .array(requiredText)
        .min(1, "Expected at least one knowledge source."),
      assistantId: requiredText.optional(),
    })
    .optional(),
  model: z
    .object({
      provider: requiredText,
      model: requiredText,
    })
    .optional(),
  voice: z
    .object({
      provider: requiredText,
      voiceId: requiredText,
      model: requiredText.optional(),
    })
    .optional(),
  transcriber: z
    .object({
      provider: requiredText,
      model: requiredText,
      language: requiredText,
    })
    .optional(),
});

function requiredRulesSchema(
  requiredRules: readonly string[],
  message: string,
) {
  return z
    .array(requiredText)
    .refine(
      (rules) =>
        requiredRules.every((requiredRule) => rules.includes(requiredRule)),
      { message },
    );
}

export function validateAgent(input: unknown): ValidationResult {
  const result = receptionistSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: formatPath(issue.path),
      code: issue.code,
      message: issue.message,
    })),
  };
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function formatPath(path: readonly (string | number)[]): string {
  return path.reduce<string>(
    (result, segment) =>
      typeof segment === "number"
        ? `${result}[${segment}]`
        : result.length === 0
          ? segment
          : `${result}.${segment}`,
    "",
  );
}
