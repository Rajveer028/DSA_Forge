import "dotenv/config";
import { createHmac, createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createScriptClient } from "./client";

/**
 * Exercises the whole create-test / join-test loop over real HTTP with two
 * separate accounts, exactly as two people in a room would.
 */

const BASE =
  process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : "http://127.0.0.1:3000";
const SECRET =
  process.env.SESSION_SECRET ??
  createHash("sha256").update(`dsa-forge-dev:${process.cwd()}`).digest("hex");
const sign = (token: string) => createHmac("sha256", SECRET).update(token).digest("base64url");

const db = createScriptClient();

async function makeUser(label: string) {
  const email = `${label}+${Date.now()}@example.com`;
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
          fullName: label === "host" ? "Priya Host" : "Sam Student",
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

const post = (path: string, cookie: string, body: unknown) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const host = await makeUser("host");
  const student = await makeUser("student");
  const other = await makeUser("student2");

  console.log("\n1. Host creates a test: 2 catalogue problems + 1 written on the spot");
  const catalog = await db.question.findMany({
    where: { isPublished: true },
    orderBy: { number: "asc" },
    take: 2,
    select: { id: true, title: true },
  });

  const createRes = await post("/api/university/tests/quick", host.cookie, {
    name: "Mock Round 1",
    subject: "DSA",
    durationMinutes: 45,
    capacity: 2,
    marksPerQuestion: 25,
    passingPercent: 40,
    allowedLanguages: ["CPP", "PYTHON"],
    catalogQuestionIds: catalog.map((q) => q.id),
    customQuestions: [
      {
        title: "Add two numbers",
        description: "Read two integers and print their sum. This is a warm-up question.",
        topic: "math",
        difficulty: "EASY",
        inputFormat: "Two integers a and b.",
        outputFormat: "Their sum.",
        constraints: "-1000 <= a, b <= 1000",
        sampleInput: "2 3",
        sampleOutput: "5",
        defaultMarks: 25,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        supportedLanguages: ["CPP", "PYTHON"],
        testCases: [
          { kind: "SAMPLE", input: "2 3", expectedOutput: "5", points: 1 },
          { kind: "HIDDEN", input: "-4 9", expectedOutput: "5", points: 2 },
        ],
      },
    ],
    publish: true,
  });
  const created = (await createRes.json()) as {
    test?: { id: string; joinCode: string; capacity: number; totalMarks: number };
    questionCount?: number;
    workspaceCreated?: boolean;
    error?: string;
  };
  check("test created", createRes.ok, created.error ?? "");
  if (!created.test) {
    console.log(JSON.stringify(created));
    process.exit(1);
  }
  check("3 questions on the paper", created.questionCount === 3, `got ${created.questionCount}`);
  check("code generated", /^FORGE-[A-Z0-9]{6}$/.test(created.test.joinCode), created.test.joinCode);
  check("marks computed from the paper", created.test.totalMarks === 75, `${created.test.totalMarks}`);
  check("workspace auto-created for a non-faculty host", created.workspaceCreated === true);

  const code = created.test.joinCode;
  console.log(`     code: ${code}`);

  console.log("\n2. Imported catalogue questions keep their hidden tests");
  const paper = await db.universityTestQuestion.findMany({
    where: { testId: created.test.id },
    include: { question: { include: { _count: { select: { testCases: true } } } } },
    orderBy: { orderIndex: "asc" },
  });
  check("paper has 3 questions", paper.length === 3);
  check(
    "first imported problem brought its whole suite",
    paper[0].question._count.testCases >= 7,
    `${paper[0].question._count.testCases} cases`,
  );
  check("titles match the catalogue", paper[0].question.title === catalog[0].title);

  console.log("\n3. A second user joins with the code");
  const joinRes = await post("/api/university/tests/join", student.cookie, { code });
  const joined = (await joinRes.json()) as { ok?: boolean; testId?: string; error?: string };
  check("join accepted", joinRes.ok, joined.error ?? "");
  check("joined the right test", joined.testId === created.test.id);

  console.log("\n4. The code is forgiving about how it is typed");
  const lower = await post("/api/university/tests/join", student.cookie, {
    code: code.replace("FORGE-", "").toLowerCase(),
  });
  const lowerData = (await lower.json()) as { alreadyJoined?: boolean; error?: string };
  check("lowercase, no prefix still resolves", lower.ok, lowerData.error ?? "");
  check("re-joining is idempotent", lowerData.alreadyJoined === true);

  console.log("\n5. Guards");
  const hostJoin = await post("/api/university/tests/join", host.cookie, { code });
  check("host cannot join their own test", hostJoin.status === 409, `status ${hostJoin.status}`);

  const badCode = await post("/api/university/tests/join", other.cookie, { code: "FORGE-XXXXXX" });
  check("unknown code rejected", badCode.status === 404, `status ${badCode.status}`);

  const secondJoin = await post("/api/university/tests/join", other.cookie, { code });
  check("second seat fits capacity 2", secondJoin.ok);

  const third = await makeUser("student3");
  const overflow = await post("/api/university/tests/join", third.cookie, { code });
  const overflowBody = (await overflow.json()) as { error?: string };
  check(
    "third join refused — test is full",
    overflow.status === 409,
    overflowBody.error ?? `status ${overflow.status}`,
  );

  console.log("\n6. The joined student sees the test in the portal");
  const portal = await fetch(`${BASE}/university`, { headers: { cookie: student.cookie } });
  const html = await portal.text();
  check("portal renders", portal.ok);
  check("shows the joined test", html.includes("Mock Round 1"));
  check("shows both sections", html.includes("Create a test") && html.includes("Join a test"));

  const hostPortal = await fetch(`${BASE}/university`, { headers: { cookie: host.cookie } });
  const hostHtml = await hostPortal.text();
  check("host sees their code on the portal", hostHtml.includes(code));

  console.log("\n7. Student can open the test page and it is startable");
  const testPage = await fetch(`${BASE}/university/tests/${created.test.id}`, {
    headers: { cookie: student.cookie },
  });
  check("student may view the test", testPage.status === 200, `status ${testPage.status}`);

  const hostTestPage = await fetch(`${BASE}/university/tests/${created.test.id}`, {
    headers: { cookie: host.cookie },
  });
  const hostTestHtml = await hostTestPage.text();
  check("host view shows the code", hostTestPage.ok && hostTestHtml.includes(code));

  console.log(`\n=== ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`} ===`);

  // Clean up every row these accounts created.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await db.universityTest.deleteMany({ where: { id: created.test.id } });
      const workspaces = await db.university.findMany({
        where: { members: { some: { userId: host.profileId } } },
        select: { id: true },
      });
      await db.university.deleteMany({ where: { id: { in: workspaces.map((w) => w.id) } } });
      await db.userAccount.deleteMany({
        where: { id: { in: [host.accountId, student.accountId, other.accountId, third.accountId] } },
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
