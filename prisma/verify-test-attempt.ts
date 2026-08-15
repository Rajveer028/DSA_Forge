import "dotenv/config";
import { createHmac, createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * A student who enrolled with a code must be able to actually sit the test:
 * start it, run code, submit each question and submit the paper, with marks
 * computed server-side. That is the integration this checks.
 */

const BASE = "http://127.0.0.1:3000";
const SECRET = createHash("sha256").update(`dsa-forge-dev:${process.cwd()}`).digest("hex");
const sign = (token: string) => createHmac("sha256", SECRET).update(token).digest("base64url");

const db = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dsaforge.db" }),
});

async function makeUser(label: string, name: string) {
  const email = `${label}+${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;
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
          fullName: name,
          role: "STUDENT",
          onboardingCompleted: true,
          onboardingStep: 5,
          preferences: { create: {} },
          learningProgress: { create: {} },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });

  const token = randomBytes(32).toString("base64url");
  await db.authSession.create({
    data: {
      accountId: account.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });

  return {
    accountId: account.id,
    profileId: account.profile!.id,
    cookie: `forge_session=${token}.${sign(token)}`,
  };
}

const post = (path: string, cookie: string, body?: unknown) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const host = await makeUser("host", "Priya Host");
  const student = await makeUser("sitter", "Sam Student");

  console.log("\n1. Host creates a one-question test");
  const createRes = await post("/api/university/tests/quick", host.cookie, {
    name: "Sit-through check",
    durationMinutes: 30,
    capacity: 5,
    marksPerQuestion: 20,
    passingPercent: 40,
    allowedLanguages: ["PYTHON"],
    catalogQuestionIds: [],
    customQuestions: [
      {
        title: "Sum two integers",
        description: "Read two integers from standard input and print their sum.",
        topic: "math",
        difficulty: "EASY",
        inputFormat: "Two integers a and b on one line.",
        outputFormat: "Their sum.",
        constraints: "-1000 <= a, b <= 1000",
        sampleInput: "2 3",
        sampleOutput: "5",
        defaultMarks: 20,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        supportedLanguages: ["PYTHON"],
        testCases: [
          { kind: "SAMPLE", input: "2 3", expectedOutput: "5", points: 1 },
          { kind: "HIDDEN", input: "-4 9", expectedOutput: "5", points: 2 },
          { kind: "HIDDEN", input: "1000 1000", expectedOutput: "2000", points: 2 },
        ],
      },
    ],
    publish: true,
  });
  const created = (await createRes.json()) as {
    test?: { id: string; joinCode: string };
    error?: string;
  };
  check("test created", createRes.ok, created.error ?? "");
  if (!created.test) process.exit(1);

  const testId = created.test.id;
  const questionLink = await db.universityTestQuestion.findFirst({
    where: { testId },
    select: { questionId: true },
  });

  console.log("\n2. Student joins with the code");
  const joinRes = await post("/api/university/tests/join", student.cookie, {
    code: created.test.joinCode,
  });
  check("joined", joinRes.ok);

  console.log("\n3. Student starts the attempt");
  const startRes = await post(`/api/university/tests/${testId}/attempt`, student.cookie);
  const start = (await startRes.json()) as {
    status?: string;
    secondsRemaining?: number;
    error?: string;
  };
  check("attempt started", startRes.ok, start.error ?? "");
  check("status IN_PROGRESS", start.status === "IN_PROGRESS");
  check(
    "server clock issued a deadline",
    (start.secondsRemaining ?? 0) > 1700 && (start.secondsRemaining ?? 0) <= 1800,
    `${start.secondsRemaining}s left`,
  );

  const solution = `import sys
data = sys.stdin.read().split()
print(int(data[0]) + int(data[1]))
`;

  console.log("\n4. Student runs the code against the public case");
  const runRes = await post(`/api/university/tests/${testId}/execute`, student.cookie, {
    testId,
    questionId: questionLink!.questionId,
    language: "PYTHON",
    code: solution,
  });
  const run = (await runRes.json()) as { verdict?: string; passedTests?: number; error?: string };
  check("run executed", runRes.ok, run.error ?? "");
  check("public case passes", run.passedTests !== undefined && run.passedTests >= 1, `${run.verdict}`);

  console.log("\n5. Student submits the question for marking");
  const submitRes = await post(`/api/university/tests/${testId}/execute`, student.cookie, {
    testId,
    questionId: questionLink!.questionId,
    language: "PYTHON",
    code: solution,
    mode: "submit",
  });
  const submitted = (await submitRes.json()) as {
    verdict?: string;
    passedTests?: number;
    totalTests?: number;
    error?: string;
  };
  check("question submitted", submitRes.ok, submitted.error ?? "");
  check(
    "every case passes, including the hidden ones",
    submitted.verdict === "ACCEPTED",
    `${submitted.verdict} ${submitted.passedTests}/${submitted.totalTests}`,
  );

  console.log("\n6. Student submits the paper");
  const finalRes = await post(`/api/university/tests/${testId}/final`, student.cookie);
  const final = (await finalRes.json()) as { submitted?: boolean; error?: string };
  check("final submit accepted", finalRes.ok, final.error ?? "");
  check("marked submitted", final.submitted === true);

  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId, userId: student.profileId } },
    select: { status: true, submittedAt: true },
  });
  check("attempt closed in the database", assignment?.status === "SUBMITTED", `${assignment?.status}`);

  const result = await db.universityResult.findFirst({
    where: { testId, userId: student.profileId },
    select: { totalMarks: true, maxMarks: true, percentage: true },
  });
  check(
    "full marks awarded for the solved question",
    result?.totalMarks === 20,
    result ? `${result.totalMarks}/${result.maxMarks} (${result.percentage}%)` : "no result row",
  );

  console.log("\n7. Host sees the roster and results");
  const resultsPage = await fetch(`${BASE}/university/tests/${testId}/results`, {
    headers: { cookie: host.cookie },
  });
  const resultsHtml = await resultsPage.text();
  check("results page renders for the host", resultsPage.ok, `status ${resultsPage.status}`);
  check("student appears on it", resultsHtml.includes("Sam Student"));

  console.log(`\n=== ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`} ===`);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await db.universityTest.deleteMany({ where: { id: testId } });
      const workspaces = await db.university.findMany({
        where: { members: { some: { userId: host.profileId } } },
        select: { id: true },
      });
      await db.university.deleteMany({ where: { id: { in: workspaces.map((w) => w.id) } } });
      await db.userAccount.deleteMany({
        where: { id: { in: [host.accountId, student.accountId] } },
      });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  await db.$disconnect();
  process.exit(failures ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
