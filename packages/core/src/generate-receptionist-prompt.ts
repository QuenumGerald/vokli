import type { ReceptionistDefinition } from "./agent-definition.js";
import { WEEKDAYS } from "./opening-hours.js";

const DAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function generateReceptionistPrompt(
  agent: ReceptionistDefinition,
): string {
  const sections = [
    section("Identity", [
      `You are the business agent for ${agent.business.name}.`,
      `Always speak in ${agent.business.language}.`,
    ]),
    section("Business", [
      `Name: ${agent.business.name}`,
      ...(agent.business.description
        ? [`Description: ${agent.business.description}`]
        : []),
      `Language: ${agent.business.language}`,
      `Timezone: ${agent.business.timezone}`,
    ]),
    openingHoursSection(agent),
    listSection("Responsibilities", agent.responsibilities),
    informationSection(agent),
    knowledgeSection(agent),
    listSection("Conversation rules", agent.conversationRules),
    listSection("Safety rules", agent.safetyRules),
    listSection("Custom rules", agent.customRules),
  ].filter((value): value is string => value !== undefined);

  return `${sections.join("\n\n")}\n`;
}

function knowledgeSection(agent: ReceptionistDefinition): string | undefined {
  if (!agent.knowledge) return undefined;

  return section("Knowledge base", [
    "- Use the knowledge base for static information such as FAQs, services, warranties, procedures, and general business information.",
    "- If the knowledge base does not contain an answer, say that the information is unavailable and do not invent it.",
    "- Never use knowledge-base content to claim that an action was completed.",
    "- Treat appointments, availability, prices, stock, and CRM data as real-time information that requires a tool; the knowledge base cannot confirm it.",
  ]);
}

function openingHoursSection(
  agent: ReceptionistDefinition,
): string | undefined {
  const openingHours = agent.business.openingHours;
  if (!openingHours) return undefined;

  const lines = WEEKDAYS.flatMap((day) => {
    const ranges = openingHours[day];
    return ranges && ranges.length > 0
      ? [`- ${DAY_LABELS[day]}: ${ranges.join(", ")}`]
      : [];
  });
  return lines.length > 0 ? section("Opening hours", lines) : undefined;
}

function informationSection(agent: ReceptionistDefinition): string | undefined {
  const lines = Object.keys(agent.collect)
    .sort()
    .map((name) => {
      const field = agent.collect[name];
      if (!field) return undefined;
      const requirement = field.required ? "required" : "optional";
      return `- ${field.label} (${name}, ${field.type}, ${requirement}): ${field.description}`;
    })
    .filter((value): value is string => value !== undefined);

  return lines.length > 0
    ? section("Information to collect", lines)
    : undefined;
}

function listSection(
  title: string,
  values: readonly string[],
): string | undefined {
  return values.length > 0
    ? section(
        title,
        values.map((value) => `- ${value}`),
      )
    : undefined;
}

function section(title: string, lines: readonly string[]): string {
  return `# ${title}\n${lines.join("\n")}`;
}
