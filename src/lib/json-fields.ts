import type { CareerGoal, Language } from "@/generated/prisma/enums";

/**
 * SQLite has no array columns, so list-valued fields are stored as JSON.
 * Prisma types those as `JsonValue`; these helpers narrow them back to the
 * shapes the rest of the app expects, tolerating a null or malformed value
 * rather than throwing.
 */

const LANGUAGES = new Set(["C", "CPP", "JAVA", "PYTHON"]);
const CAREER_GOALS = new Set([
  "LEARN_DSA",
  "UNIVERSITY_PREP",
  "PLACEMENT_PREP",
  "PRODUCT_COMPANY",
  "SERVICE_COMPANY",
  "COMPETITIVE_PROGRAMMING",
  "INTERVIEW_PREP",
]);

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function toLanguages(value: unknown): Language[] {
  return asArray(value).filter(
    (item): item is Language => typeof item === "string" && LANGUAGES.has(item),
  );
}

export function toCareerGoals(value: unknown): CareerGoal[] {
  return asArray(value).filter(
    (item): item is CareerGoal => typeof item === "string" && CAREER_GOALS.has(item),
  );
}

export function toStrings(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === "string");
}

/** Every language, used as the default for a question with none recorded. */
export const ALL_LANGUAGES: Language[] = ["C", "CPP", "JAVA", "PYTHON"];

/** Languages a question supports, falling back to all four. */
export function supportedLanguages(value: unknown): Language[] {
  const parsed = toLanguages(value);
  return parsed.length > 0 ? parsed : ALL_LANGUAGES;
}
