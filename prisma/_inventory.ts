import { createScriptClient, describeTarget } from "./client";

async function main() {
  const db = createScriptClient();
  const [questions, testCases, accounts, universities, tests, submissions, attempts] =
    await Promise.all([
      db.question.count(),
      db.testCase.count(),
      db.userAccount.count(),
      db.university.count(),
      db.universityTest.count(),
      db.submission.count(),
      db.questionAttempt.count(),
    ]);

  console.log(`\n  target                ${describeTarget()}`);
  console.log(`  questions             ${questions}`);
  console.log(`  test cases            ${testCases}`);
  console.log(`  user accounts         ${accounts}`);
  console.log(`  universities          ${universities}`);
  console.log(`  university tests      ${tests}`);
  console.log(`  practice submissions  ${submissions}`);
  console.log(`  question attempts     ${attempts}\n`);

  await db.$disconnect();
}

main();
