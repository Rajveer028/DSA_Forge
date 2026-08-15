import "dotenv/config";
import { createHmac, createHash, randomBytes } from "node:crypto";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * End-to-end smoke test driven directly against the real database and the
 * real running server, bypassing only the browser (Server Actions require a
 * live RSC action id that only a JS-executing client can obtain). Every value
 * this script writes is exactly what `signUpAction` / `createSession` write —
 * it exercises the same schema, the same password hash format and the same
 * session cookie signing as the app itself, then confirms the server accepts
 * the resulting session over real HTTP.
 */

const url = process.env.DATABASE_URL ?? "file:./prisma/dsaforge.db";
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
const BASE = "http://127.0.0.1:3000";
const SECRET = createHash("sha256").update(`dsa-forge-dev:${process.cwd()}`).digest("hex");

function sign(token: string) {
  return createHmac("sha256", SECRET).update(token).digest("base64url");
}

async function main() {
  const email = `e2e+${Date.now()}@example.com`;

  // Same scrypt format as src/lib/auth/password.ts, reimplemented minimally
  // here so this script has no dependency on Next's module resolution.
  const { scrypt } = await import("node:crypto");
  const { promisify } = await import("node:util");
  const scryptAsync = promisify(scrypt) as (
    p: string,
    s: Buffer,
    n: number,
    o: { N: number; r: number; p: number; maxmem: number },
  ) => Promise<Buffer>;
  const salt = randomBytes(16);
  const key = await scryptAsync(email, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 96 * 1024 * 1024 });
  const passwordHash = `scrypt$16384$8$1$${salt.toString("hex")}$${key.toString("hex")}`;

  console.log("1. Creating account + profile (identical shape to signUpAction)...");
  const account = await db.userAccount.create({
    data: {
      email,
      passwordHash,
      profile: {
        create: {
          email,
          fullName: "E2E Tester",
          role: "STUDENT",
          preferences: { create: {} },
          learningProgress: { create: {} },
        },
      },
    },
    select: { id: true },
  });
  console.log("   account:", account.id);

  const token = randomBytes(32).toString("base64url");
  await db.authSession.create({
    data: {
      accountId: account.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  const cookie = `forge_session=${token}.${sign(token)}`;
  console.log("2. Session row created, cookie signed.");

  const get = async (path: string) => {
    const res = await fetch(BASE + path, {
      headers: { cookie },
      redirect: "manual",
    });
    return res;
  };

  console.log("\n3. GET /onboarding (should render the wizard, not redirect)...");
  let res = await get("/onboarding");
  console.log("   status:", res.status);
  let body = await res.text();
  console.log("   has wizard heading:", body.includes("Personal information"));

  console.log("\n4. Completing onboarding directly in the DB (same writes as the action)...");
  const topics = await db.topic.findMany({ take: 3, select: { id: true } });
  const profile = await db.userProfile.update({
    where: { accountId: account.id },
    data: {
      college: "Forge Institute of Technology",
      degree: "B.Tech",
      branch: "Computer Science",
      academicYear: "3rd Year",
      languages: JSON.stringify(["CPP", "PYTHON"]),
      dsaLevel: "BEGINNER",
      careerGoals: JSON.stringify(["PLACEMENT_PREP"]),
      onboardingCompleted: true,
      onboardingStep: 5,
    },
    select: { id: true },
  });
  await db.userTopicInterest.createMany({
    data: topics.map((t) => ({ userId: profile.id, topicId: t.id })),
  });

  console.log("\n5. GET /dashboard (should render for real, no setup notice, no redirect)...");
  res = await get("/dashboard");
  body = await res.text();
  console.log("   status:", res.status);
  console.log("   has 'Welcome back':", body.includes("Welcome back"));
  console.log("   has 'Setup required':", body.includes("Setup required"));

  console.log("\n6. GET /practice (should list real seeded problems)...");
  res = await get("/practice");
  body = await res.text();
  console.log("   status:", res.status);
  console.log("   has 'Practice Arena':", body.includes("Practice Arena"));
  console.log("   mentions Two Sum:", body.includes("Two Sum"));

  console.log("\n7. GET /practice/two-sum (a real problem page)...");
  res = await get("/practice/two-sum");
  body = await res.text();
  console.log("   status:", res.status);
  console.log("   has problem statement:", body.includes("Given an array of integers"));

  console.log("\n8. POST /api/practice/run — actually compiling and executing code...");
  const question = await db.question.findUnique({ where: { slug: "two-sum" }, select: { id: true } });
  res = await fetch(BASE + "/api/practice/run", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      questionId: question!.id,
      language: "PYTHON",
      code: `import sys
data = sys.stdin.read().split()
n, target = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
seen = {}
for i, v in enumerate(a):
    need = target - v
    if need in seen:
        print(seen[need], i)
        break
    seen[v] = i
`,
    }),
  });
  const runResult = (await res.json()) as Record<string, unknown>;
  console.log("   status:", res.status);
  console.log("   verdict:", runResult.verdict);
  console.log("   passedTests/totalTests:", runResult.passedTests, "/", runResult.totalTests);

  console.log("\n9. POST /api/practice/submit — full hidden suite, checks progress update...");
  res = await fetch(BASE + "/api/practice/submit", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      questionId: question!.id,
      language: "PYTHON",
      code: `import sys
data = sys.stdin.read().split()
n, target = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
seen = {}
for i, v in enumerate(a):
    need = target - v
    if need in seen:
        print(seen[need], i)
        break
    seen[v] = i
`,
      timeSpentSec: 42,
    }),
  });
  const submitResult = (await res.json()) as Record<string, unknown>;
  console.log("   status:", res.status);
  console.log("   verdict:", submitResult.verdict);
  console.log("   firstSolve:", submitResult.firstSolve);
  console.log("   totalSolved:", submitResult.totalSolved);
  console.log("   xpAwarded:", submitResult.xpAwarded);

  console.log("\n10. Verifying the solve landed in the database...");
  const attempt = await db.questionAttempt.findUnique({
    where: { userId_questionId: { userId: profile.id, questionId: question!.id } },
  });
  console.log("   attempt.outcome:", attempt?.outcome);
  const progress = await db.learningProgress.findUnique({ where: { userId: profile.id } });
  console.log("   learningProgress.totalSolved:", progress?.totalSolved);

  console.log("\n11. GET /progress (should reflect the solve)...");
  res = await get("/progress");
  body = await res.text();
  console.log("   status:", res.status);

  console.log("\n12. Sign-in page check (unauthenticated request should redirect from /dashboard)...");
  const anon = await fetch(BASE + "/dashboard", { redirect: "manual" });
  console.log("   status:", anon.status, "location:", anon.headers.get("location"));

  console.log("\n=== SUMMARY ===");
  const ok =
    attempt?.outcome === "SOLVED" &&
    (progress?.totalSolved ?? 0) >= 1 &&
    submitResult.verdict === "ACCEPTED" &&
    anon.status === 307;
  console.log(ok ? "END-TO-END FLOW VERIFIED" : "SOMETHING DID NOT MATCH — REVIEW ABOVE");
  console.log("\nSession left alive for manual follow-up. Cookie:");
  console.log(`  ${cookie}`);
  console.log(`Delete later with: DELETE FROM user_accounts WHERE id = '${account.id}';`);
}

main()
  .catch((error) => {
    console.error("E2E CHECK FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
