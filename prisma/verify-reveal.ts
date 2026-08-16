import "dotenv/config";
import { createHmac, createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createScriptClient } from "./client";

/**
 * Walks the exact path a user takes: reveal the answer, paste the revealed
 * code into the editor, submit it. Every stored reference solution must come
 * back ACCEPTED through the real HTTP API, not just through the harness.
 */

const BASE = "http://127.0.0.1:3000";
const SECRET = createHash("sha256").update(`dsa-forge-dev:${process.cwd()}`).digest("hex");
const sign = (token: string) => createHmac("sha256", SECRET).update(token).digest("base64url");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const db = createScriptClient();

  const email = `reveal+${Date.now()}@example.com`;
  const scryptAsync = promisify(scrypt) as (
    p: string,
    s: Buffer,
    n: number,
    o: { N: number; r: number; p: number; maxmem: number },
  ) => Promise<Buffer>;
  const salt = randomBytes(16);
  const key = await scryptAsync(email, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 96 * 1024 * 1024 });

  const account = await db.userAccount.create({
    data: {
      email,
      passwordHash: `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`,
      profile: {
        create: {
          email,
          fullName: "Reveal Tester",
          role: "STUDENT",
          onboardingCompleted: true,
          onboardingStep: 5,
          preferences: { create: {} },
          learningProgress: { create: {} },
        },
      },
    },
    select: { id: true },
  });

  const token = randomBytes(32).toString("base64url");
  await db.authSession.create({
    data: {
      accountId: account.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  const cookie = `forge_session=${token}.${sign(token)}`;

  const questions = await db.question.findMany({
    where: { isPublished: true },
    select: { id: true, slug: true, number: true, solutions: true },
    orderBy: { number: "asc" },
  });

  interface Case {
    id: string;
    slug: string;
    number: number;
    language: string;
  }
  const cases: Case[] = [];
  for (const q of questions) {
    const solutions = (q.solutions ?? {}) as Record<string, string>;
    for (const language of ["C", "CPP", "JAVA", "PYTHON"]) {
      if (typeof solutions[language] === "string" && solutions[language].trim()) {
        cases.push({ id: q.id, slug: q.slug, number: q.number, language });
      }
    }
  }

  console.log(`\nSubmitting ${cases.length} revealed solutions through the live API\n`);

  const failures: string[] = [];
  for (const [index, c] of cases.entries()) {
    // 1. Reveal — exactly what the "Reveal Answer" button calls.
    const revealRes = await fetch(`${BASE}/api/practice/reveal`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ questionId: c.id }),
    });
    if (!revealRes.ok) {
      failures.push(`${c.number} ${c.slug} [${c.language}]: reveal returned ${revealRes.status}`);
      continue;
    }
    const reveal = (await revealRes.json()) as { solutions: Record<string, string> };
    const code = reveal.solutions[c.language];
    if (!code) {
      failures.push(`${c.number} ${c.slug} [${c.language}]: reveal returned no code`);
      continue;
    }

    // 2. Paste it into the editor and submit it.
    let submit: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await fetch(`${BASE}/api/practice/submit`, {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          questionId: c.id,
          language: c.language,
          code,
          timeSpentSec: 30,
        }),
      });
      if (res.status === 429) {
        const retry = Number(res.headers.get("retry-after") ?? 5);
        await sleep((retry + 1) * 1000);
        continue;
      }
      submit = (await res.json()) as Record<string, unknown>;
      break;
    }

    const verdict = String(submit.verdict ?? "NO_RESPONSE");
    const line = `  ${String(index + 1).padStart(2)}/${cases.length}  ${String(c.number).padStart(3)} ${c.slug.padEnd(24)} ${c.language.padEnd(6)} ${verdict} (${submit.passedTests ?? "?"}/${submit.totalTests ?? "?"})`;
    console.log(line);
    if (verdict !== "ACCEPTED") {
      failures.push(
        `${c.number} ${c.slug} [${c.language}]: ${verdict} — ${JSON.stringify(submit.compileLog ?? submit.stderr ?? submit.error ?? "").slice(0, 300)}`,
      );
    }
  }

  console.log("\n=== RESULT ===");
  if (failures.length) {
    console.log(`${failures.length} of ${cases.length} revealed solutions did NOT pass:\n`);
    for (const f of failures) console.log(`  x ${f}`);
  } else {
    console.log(`All ${cases.length} revealed solutions submitted and returned ACCEPTED.`);
  }

  // Clean up the throwaway account so the check leaves no trace. The dev
  // server may hold the SQLite write lock for a moment after the last
  // submission, so give the delete a few attempts before giving up.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await db.userAccount.delete({ where: { id: account.id } });
      break;
    } catch {
      await sleep(1500);
    }
  }
  await db.$disconnect();
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
