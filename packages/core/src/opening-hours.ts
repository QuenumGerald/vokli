export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type OpeningHours = Partial<
  Record<Weekday, readonly string[] | undefined>
>;

export interface ParsedTimeRange {
  readonly startMinutes: number;
  readonly endMinutes: number;
}

const TIME_RANGE_PATTERN = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;

export function parseTimeRange(value: string): ParsedTimeRange | undefined {
  const match = TIME_RANGE_PATTERN.exec(value);
  if (!match) return undefined;

  const [, startHourText, startMinuteText, endHourText, endMinuteText] = match;
  const values = [startHourText, startMinuteText, endHourText, endMinuteText];
  if (values.some((part) => part === undefined)) return undefined;

  const [startHour, startMinute, endHour, endMinute] = values.map(Number);
  if (
    startHour === undefined ||
    startMinute === undefined ||
    endHour === undefined ||
    endMinute === undefined ||
    startHour > 23 ||
    endHour > 23 ||
    startMinute > 59 ||
    endMinute > 59
  ) {
    return undefined;
  }

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  if (endMinutes <= startMinutes) return undefined;

  return { startMinutes, endMinutes };
}
