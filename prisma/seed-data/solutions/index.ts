import type { Language } from "../catalog";
import { EASY_A_SOLUTIONS } from "./easy-a";
import { EASY_B_SOLUTIONS } from "./easy-b";
import { EASY_C_SOLUTIONS } from "./easy-c";
import { MEDIUM_A_SOLUTIONS } from "./medium-a";
import { MEDIUM_B_SOLUTIONS } from "./medium-b";
import { HARD_A_SOLUTIONS } from "./hard-a";
import { HARD_B_SOLUTIONS } from "./hard-b";

/**
 * Reference solutions, keyed by problem slug, split to mirror the catalogue.
 *
 * These are what "Reveal Answer" shows and what a user pastes into the editor,
 * so every one is a complete stdin -> stdout program in the shape the judge
 * runs. They live here rather than inline in the catalogue files to keep the
 * problem definitions readable, and because they are verified as a set:
 * `npm run db:verify:solutions` compiles and runs each one against every stored
 * test case, so nothing lands here that a user could not paste and get
 * ACCEPTED for.
 *
 * A slug may be absent, and a language may be absent from an entry — the
 * catalogue merges whatever is here under the problem's inline `sol` block.
 */
export type SolutionSet = Partial<Record<Language, string>>;

export const SOLUTIONS: Record<string, SolutionSet> = {
  ...EASY_A_SOLUTIONS,
  ...EASY_B_SOLUTIONS,
  ...EASY_C_SOLUTIONS,
  ...MEDIUM_A_SOLUTIONS,
  ...MEDIUM_B_SOLUTIONS,
  ...HARD_A_SOLUTIONS,
  ...HARD_B_SOLUTIONS,
};
