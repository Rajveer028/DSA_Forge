import { EASY_A } from "./easy-a";
import { EASY_B } from "./easy-b";
import { EASY_C } from "./easy-c";
import { MEDIUM_A } from "./medium-a";
import { MEDIUM_B } from "./medium-b";
import { HARD_A } from "./hard-a";
import { HARD_B } from "./hard-b";
import type { SeedQuestion } from "./catalog";

/**
 * The Practice Arena catalogue.
 *
 * The Arena is specified as exactly 100 problems per difficulty. The source
 * files carry a small surplus so a problem can be swapped out without leaving a
 * gap; `takeExactly` publishes the first 100 of each level and returns the rest
 * as spares, which the seed stores unpublished.
 */

const PER_DIFFICULTY = 100;

function takeExactly(pool: SeedQuestion[], level: string) {
  if (pool.length < PER_DIFFICULTY) {
    throw new Error(
      `The ${level} catalogue holds ${pool.length} problems but ${PER_DIFFICULTY} are required.`,
    );
  }
  return {
    published: pool.slice(0, PER_DIFFICULTY),
    spare: pool.slice(PER_DIFFICULTY),
  };
}

const easy = takeExactly([...EASY_A, ...EASY_B, ...EASY_C], "Easy");
const medium = takeExactly([...MEDIUM_A, ...MEDIUM_B], "Medium");
const hard = takeExactly([...HARD_A, ...HARD_B], "Hard");

/** Exactly 300 problems: 100 Easy, 100 Medium, 100 Hard, in that order. */
export const QUESTION_CATALOG: SeedQuestion[] = [
  ...easy.published,
  ...medium.published,
  ...hard.published,
];

/** Extra problems kept in the database as unpublished spares. */
export const SPARE_QUESTIONS: SeedQuestion[] = [
  ...easy.spare,
  ...medium.spare,
  ...hard.spare,
];

export const CATALOG_COUNTS = {
  EASY: easy.published.length,
  MEDIUM: medium.published.length,
  HARD: hard.published.length,
  spare: SPARE_QUESTIONS.length,
};

export type { SeedQuestion } from "./catalog";
