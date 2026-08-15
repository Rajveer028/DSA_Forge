import { db } from "@/lib/db";
import type { Language, SimilarityVerdict } from "@/generated/prisma/enums";
import type { CodeSimilarityReportCreateManyInput } from "@/generated/prisma/models";

/**
 * Code similarity analysis for university assessments.
 *
 * This is a *review indicator*, not a verdict. Two students solving the same
 * textbook problem in the same language will legitimately score high, so the
 * output is always framed as "worth a human look" and never as an accusation.
 *
 * Method: comments and string literals are stripped, identifiers are collapsed
 * to a single token class and whitespace is normalised, so renaming variables
 * or reformatting does not hide structural equivalence. We then combine a
 * token 4-gram Jaccard score with a normalised longest-common-subsequence
 * score over the token stream.
 */

const KEYWORDS = new Set([
  "int","long","float","double","char","void","bool","string","auto","const","static","unsigned","short","signed",
  "if","else","for","while","do","switch","case","default","break","continue","return","goto",
  "class","struct","public","private","protected","new","delete","this","null","nullptr","none","true","false",
  "import","from","include","using","namespace","def","lambda","pass","elif","try","except","catch","throw","finally",
  "vector","map","set","unordered_map","unordered_set","queue","stack","deque","pair","sort","printf","scanf",
  "cin","cout","endl","system","out","println","print","range","len","input","main","static_cast","size","push_back",
  "append","not","and","or","in","is","with","as","yield","global","final","extends","implements","package","throws",
]);

export function normalizeCode(code: string, language: Language) {
  let text = code;

  // Strip comments.
  if (language === "PYTHON") {
    text = text.replace(/#[^\n]*/g, " ").replace(/("""|''')[\s\S]*?\1/g, " ");
  } else {
    text = text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  }
  // Strip string / char literals.
  text = text.replace(/"(?:\\.|[^"\\])*"/g, ' "S" ').replace(/'(?:\\.|[^'\\])*'/g, ' "S" ');

  return text.toLowerCase();
}

export function tokenize(code: string, language: Language): string[] {
  const normalized = normalizeCode(code, language);
  const raw = normalized.match(/[a-z_][a-z0-9_]*|\d+|[^\sa-z0-9_]/g) ?? [];
  return raw
    .filter((token) => token.trim().length > 0)
    .map((token) => {
      if (/^\d+$/.test(token)) return "#NUM";
      if (/^[a-z_]/.test(token)) return KEYWORDS.has(token) ? token : "#ID";
      return token;
    });
}

function ngrams(tokens: string[], n = 4) {
  const set = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i += 1) {
    set.add(tokens.slice(i, i + n).join(" "));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

/** Normalised LCS over token streams, capped for performance. */
function lcsRatio(a: string[], b: string[]) {
  const MAX = 900;
  const x = a.slice(0, MAX);
  const y = b.slice(0, MAX);
  if (x.length === 0 || y.length === 0) return 0;

  let previous = new Uint16Array(y.length + 1);
  let current = new Uint16Array(y.length + 1);

  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      current[j] = x[i - 1] === y[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    }
    [previous, current] = [current, previous];
    current.fill(0);
  }
  return previous[y.length] / Math.max(x.length, y.length);
}

export interface SimilarityScore {
  similarity: number;
  tokenSimilarity: number;
  structuralSimilarity: number;
  verdict: SimilarityVerdict;
}

export function compareCode(a: string, b: string, language: Language): SimilarityScore {
  const ta = tokenize(a, language);
  const tb = tokenize(b, language);

  const tokenSimilarity = jaccard(ngrams(ta), ngrams(tb));
  const structuralSimilarity = lcsRatio(ta, tb);
  const similarity = tokenSimilarity * 0.55 + structuralSimilarity * 0.45;

  const verdict: SimilarityVerdict =
    similarity >= 0.85 ? "REVIEW_RECOMMENDED" : similarity >= 0.65 ? "MODERATE" : "LOW";

  return {
    similarity: round(similarity),
    tokenSimilarity: round(tokenSimilarity),
    structuralSimilarity: round(structuralSimilarity),
    verdict,
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 10; // percentage with one decimal
}

/** Recomputes and stores pairwise similarity for every question in a test. */
export async function runSimilarityAnalysis(testId: string) {
  const submissions = await db.universitySubmission.findMany({
    where: { testId, isFinal: true },
    include: { user: { select: { id: true, fullName: true } } },
  });

  await db.codeSimilarityReport.deleteMany({ where: { testId } });

  const byQuestion = new Map<string, typeof submissions>();
  for (const submission of submissions) {
    const list = byQuestion.get(submission.questionId) ?? [];
    list.push(submission);
    byQuestion.set(submission.questionId, list);
  }

  const rows: CodeSimilarityReportCreateManyInput[] = [];
  let created = 0;

  for (const [questionId, list] of byQuestion) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (a.language !== b.language) continue;
        if (a.code.trim().length < 40 || b.code.trim().length < 40) continue;

        const score = compareCode(a.code, b.code, a.language);
        if (score.similarity < 45) continue; // only store pairs worth surfacing

        rows.push({
          testId,
          questionId,
          userAId: a.userId,
          userBId: b.userId,
          userAName: a.user.fullName,
          userBName: b.user.fullName,
          language: a.language,
          similarity: score.similarity,
          tokenSimilarity: score.tokenSimilarity,
          structuralSimilarity: score.structuralSimilarity,
          verdict: score.verdict,
        });
        created += 1;
      }
    }
  }

  if (rows.length > 0) {
    await db.codeSimilarityReport.createMany({ data: rows });
  }
  return created;
}
