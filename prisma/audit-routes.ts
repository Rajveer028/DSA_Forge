import "dotenv/config";
import { createHmac, createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createScriptClient } from "./client";

/**
 * Walks every page and API route as a signed-in user and reports what came
 * back. It is a smoke test, not a correctness test: it proves nothing throws,
 * renders a 500 or 404s by accident, which is exactly the class of breakage
 * that only shows up once something is deployed.
 *
 *   npx tsx prisma/audit-routes.ts [--base http://localhost:3000]
 */

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

const BASE = arg("base") ?? "http://localhost:3000";
const SECRET =
  process.env.SESSION_SECRET ??
  createHash("sha256").update(`dsa-forge-dev:${process.cwd()}`).digest("hex");
const sign = (token: string) => createHmac("sha256", SECRET).update(token).digest("base64url");

const db = createScriptClient();

interface Result {
  method: string;
  path: string;
  status: number;
  note: string;
  ok: boolean;
}

const results: Result[] = [];

/** Which status codes are legitimate for a given call. */
function judge(status: number, allowed: number[]) {
  return allowed.includes(status);
}

async function main() {
  // ---- a signed-in user to walk the site as ------------------------------
  const email = `audit+${Date.now()}@example.com`;
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
          fullName: "Audit Walker",
          role: "ADMIN",
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
  const cookie = `forge_session=${token}.${sign(token)}`;
  const profileId = account.profile!.id;

  // ---- real ids to build real URLs with ----------------------------------
  const question = await db.question.findFirst({
    where: { isPublished: true },
    select: { id: true, slug: true },
    orderBy: { number: "asc" },
  });
  const company = await db.company.findFirst({ select: { slug: true } });

  // A test this user hosts, so the university pages have something to show.
  const hosted = await fetch(`${BASE}/api/university/tests/quick`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Audit sweep test",
      durationMinutes: 30,
      capacity: 5,
      marksPerQuestion: 10,
      allowedLanguages: ["PYTHON"],
      catalogQuestionIds: question ? [question.id] : [],
      customQuestions: [],
      publish: true,
    }),
  });
  const hostedBody = (await hosted.json()) as { test?: { id: string } };
  const testId = hostedBody.test?.id;

  const uniQuestion = await db.universityQuestion.findFirst({ select: { id: true } });

  async function get(path: string, allowed = [200], note = "") {
    try {
      const response = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
      results.push({
        method: "GET",
        path,
        status: response.status,
        note,
        ok: judge(response.status, allowed),
      });
    } catch (error) {
      results.push({ method: "GET", path, status: 0, note: (error as Error).message, ok: false });
    }
  }

  async function post(path: string, body: unknown, allowed = [200], note = "") {
    try {
      const response = await fetch(BASE + path, {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      results.push({
        method: "POST",
        path,
        status: response.status,
        note,
        ok: judge(response.status, allowed),
      });
    } catch (error) {
      results.push({ method: "POST", path, status: 0, note: (error as Error).message, ok: false });
    }
  }

  console.log("\n--- pages ---");
  await get("/");
  await get("/sign-in", [200, 307]);
  await get("/sign-up", [200, 307]);
  await get("/onboarding", [200, 307], "already onboarded, may redirect");
  await get("/dashboard");
  await get("/practice");
  if (question) await get(`/practice/${question.slug}`);
  await get("/interview-prep");
  if (company) await get(`/interview-prep/${company.slug}`);
  await get("/progress");
  await get("/achievements");
  await get("/profile");
  await get("/settings");
  await get("/admin", [200, 307], "admin only");
  await get("/university");
  await get("/university/questions");
  await get("/university/questions/new");
  if (uniQuestion) await get(`/university/questions/${uniQuestion.id}`, [200, 404]);
  await get("/university/tests/create");
  await get("/university/tests/new", [200, 307], "faculty flow");
  if (testId) {
    await get(`/university/tests/${testId}`);
    await get(`/university/tests/${testId}/results`);
  }
  await get("/does-not-exist", [404], "expected 404");

  console.log("--- api: GET ---");
  await get("/api/health");
  await get("/api/notifications");
  await get("/api/search?q=array");
  await get("/api/profile", [200, 405]);
  await get("/api/practice/submissions?questionId=" + (question?.id ?? ""), [200, 400]);
  await get("/api/interview-prep", [200, 400, 405]);
  await get("/api/ai/recommendations", [200, 405]);
  if (testId) {
    await get(`/api/university/tests/${testId}`, [200, 405]);
    await get(`/api/university/tests/${testId}/export`, [200, 403, 404]);
  }

  console.log("--- api: POST ---");
  if (question) {
    await post("/api/practice/run", {
      questionId: question.id,
      language: "PYTHON",
      code: "import sys\nprint(sum(map(int, sys.stdin.read().split()[2:])))\n",
    }, [200, 503], "executes code (503 where no sandbox is configured)");
    await post("/api/practice/reveal", { questionId: question.id });
    await post("/api/practice/hint", { questionId: question.id, level: 1 }, [200, 429]);
  }
  await post("/api/university/tests/join", { code: "FORGE-NOSUCH" }, [404], "bad code rejected");
  await post("/api/university/join", { joinCode: "NOPE" }, [404], "bad code rejected");
  await post("/api/search", {}, [405, 400], "GET-only route");

  // ---- report -------------------------------------------------------------
  const failures = results.filter((r) => !r.ok);
  console.log("\n=== RESULTS ===\n");
  for (const r of results) {
    const mark = r.ok ? "ok  " : "FAIL";
    console.log(
      `  ${mark} ${r.method.padEnd(4)} ${String(r.status).padEnd(4)} ${r.path}${r.note ? `  (${r.note})` : ""}`,
    );
  }
  console.log(
    `\n  ${results.length} routes checked, ${failures.length} unexpected\n`,
  );

  // ---- clean up -----------------------------------------------------------
  if (testId) await db.universityTest.deleteMany({ where: { id: testId } });
  await db.university.deleteMany({ where: { members: { some: { userId: profileId } } } });
  await db.userAccount.deleteMany({ where: { id: account.id } });
  await db.$disconnect();

  process.exit(failures.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
