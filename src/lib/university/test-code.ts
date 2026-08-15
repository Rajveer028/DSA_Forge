import { randomInt } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Per-test join codes.
 *
 * A code is read off a screen and typed by hand, so the alphabet leaves out
 * every pair that looks alike in a sans-serif font: O/0, I/1/L, S/5, B/8, Z/2.
 * What remains is unambiguous, which matters more here than entropy — the code
 * only opens enrolment for one test, and `joinOpen` can close it at any time.
 */
const ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";
const LENGTH = 6;

/** A single candidate code, e.g. "FORGE-K7QMDX". */
export function generateTestCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `FORGE-${code}`;
}

/**
 * Allocates a code that no other test holds.
 *
 * The unique index on `UniversityTest.joinCode` is the real guarantee; this
 * only avoids losing a write to a collision. With a 25-character alphabet over
 * six positions a clash is vanishingly unlikely, so a handful of attempts is
 * ample.
 */
export async function allocateTestCode(attempts = 8): Promise<string> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = generateTestCode();
    const taken = await db.universityTest.findUnique({
      where: { joinCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Could not allocate a unique test code. Please try again.");
}

/** Accepts what a user typed: trims, uppercases and re-adds the prefix. */
export function normalizeTestCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return cleaned;
  return cleaned.startsWith("FORGE-") ? cleaned : `FORGE-${cleaned.replace(/^-+/, "")}`;
}
