import "dotenv/config";
import { createScriptClient, describeTarget } from "./client";
import { TOPICS } from "../src/lib/constants";
import { GENERIC_STARTER } from "../src/lib/execution/languages";
import { CATALOG_COUNTS, QUESTION_CATALOG, SPARE_QUESTIONS } from "./seed-data";
import {
  ACHIEVEMENTS,
  COMPANIES,
  DEV_UNIVERSITY,
  DEV_UNIVERSITY_QUESTIONS,
} from "./seed-data/reference";
import type { SeedQuestion } from "./seed-data";

/**
 * Development seed.
 *
 * Loads the topic catalogue, all 300 practice problems with their generated
 * test cases, the company catalogue, achievements, and a sample university with
 * a faculty question bank and one scheduled assessment.
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so
 * running it twice is safe.
 */

const db = createScriptClient();

async function seedTopics() {
  for (const [index, topic] of TOPICS.entries()) {
    await db.topic.upsert({
      where: { slug: topic.slug },
      create: {
        slug: topic.slug,
        name: topic.name,
        description: topic.description,
        category: topic.category,
        orderIndex: index,
      },
      update: {
        name: topic.name,
        description: topic.description,
        category: topic.category,
        orderIndex: index,
      },
    });
  }
  console.log(`  topics          ${TOPICS.length}`);
}

async function seedQuestions() {
  const topics = await db.topic.findMany({ select: { id: true, slug: true } });
  const topicId = new Map(topics.map((t) => [t.slug, t.id]));

  const write = async (question: SeedQuestion, number: number, isPublished: boolean) => {
    const starterCode = GENERIC_STARTER;
    const languages = ["C", "CPP", "JAVA", "PYTHON"];
    // Mirror of supportedLanguages that the Practice Arena can filter on;
    // SQLite cannot query inside a JSON column.
    const languageTags = `,${languages.join(",")},`;

    const row = await db.question.upsert({
      where: { slug: question.slug },
      create: {
        slug: question.slug,
        number,
        title: question.title,
        description: question.description,
        difficulty: question.difficulty,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        notes: question.notes,
        examples: question.examples as never,
        starterCode: starterCode as never,
        solutions: question.solutions as never,
        hints: question.hints as never,
        approach: question.approach,
        intuition: question.intuition,
        algorithmSteps: question.steps as never,
        timeComplexity: question.timeComplexity,
        spaceComplexity: question.spaceComplexity,
        supportedLanguages: languages as never,
        languageTags,
        source: "CURATED",
        isPublished,
      },
      update: {
        number,
        title: question.title,
        description: question.description,
        difficulty: question.difficulty,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        notes: question.notes,
        examples: question.examples as never,
        starterCode: starterCode as never,
        solutions: question.solutions as never,
        hints: question.hints as never,
        approach: question.approach,
        intuition: question.intuition,
        algorithmSteps: question.steps as never,
        timeComplexity: question.timeComplexity,
        spaceComplexity: question.spaceComplexity,
        supportedLanguages: languages as never,
        languageTags,
        isPublished,
      },
      select: { id: true },
    });

    // Topics and test cases are replaced wholesale so the seed stays idempotent.
    await db.questionTopic.deleteMany({ where: { questionId: row.id } });
    await db.questionTopic.createMany({
      data: question.topics
        .filter((slug) => topicId.has(slug))
        .map((slug, index) => ({
          questionId: row.id,
          topicId: topicId.get(slug)!,
          isPrimary: index === 0,
        }))
    });

    await db.testCase.deleteMany({ where: { questionId: row.id } });
    await db.testCase.createMany({
      data: question.testCases.map((testCase, index) => ({
        questionId: row.id,
        kind: testCase.kind,
        orderIndex: index,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        points: testCase.points,
      })),
    });

    return row.id;
  };

  const idBySlug = new Map<string, string>();
  let number = 1;
  for (const question of QUESTION_CATALOG) {
    idBySlug.set(question.slug, await write(question, number, true));
    if (number % 50 === 0) console.log(`  questions       ${number}/${QUESTION_CATALOG.length}`);
    number += 1;
  }
  for (const question of SPARE_QUESTIONS) {
    await write(question, number, false);
    number += 1;
  }

  console.log(
    `  questions       ${QUESTION_CATALOG.length} published (${CATALOG_COUNTS.EASY} Easy, ${CATALOG_COUNTS.MEDIUM} Medium, ${CATALOG_COUNTS.HARD} Hard) + ${SPARE_QUESTIONS.length} spare`,
  );
  return idBySlug;
}

async function seedCompanies(questionIds: Map<string, string>) {
  const topics = await db.topic.findMany({ select: { id: true, slug: true } });
  const topicId = new Map(topics.map((t) => [t.slug, t.id]));

  // Build the company -> question links from the tags on each catalogue entry.
  const links = new Map<string, string[]>();
  for (const question of QUESTION_CATALOG) {
    for (const company of question.companies ?? []) {
      links.set(company, [...(links.get(company) ?? []), question.slug]);
    }
  }

  for (const company of COMPANIES) {
    const row = await db.company.upsert({
      where: { slug: company.slug },
      create: {
        slug: company.slug,
        name: company.name,
        category: company.category,
        logoEmoji: company.logoEmoji,
        brandColor: company.brandColor,
        description: company.description,
        hiringNotes: company.hiringNotes,
        difficultyBias: company.difficultyBias,
        orderIndex: company.orderIndex,
      },
      update: {
        name: company.name,
        category: company.category,
        logoEmoji: company.logoEmoji,
        brandColor: company.brandColor,
        description: company.description,
        hiringNotes: company.hiringNotes,
        difficultyBias: company.difficultyBias,
        orderIndex: company.orderIndex,
      },
      select: { id: true },
    });

    await db.companyTopicWeight.deleteMany({ where: { companyId: row.id } });
    await db.companyTopicWeight.createMany({
      data: Object.entries(company.topicWeights)
        .filter(([slug]) => topicId.has(slug))
        .map(([slug, weight]) => ({
          companyId: row.id,
          topicId: topicId.get(slug)!,
          weight,
        }))
    });

    // Direct tags first, then fill the set out with topic-weighted problems so
    // every company has a usable practice list. Everything is COMPANY_STYLE:
    // we never assert a problem was actually asked at the company.
    const tagged = links.get(company.slug) ?? [];
    const byWeight = QUESTION_CATALOG.filter(
      (q) =>
        !tagged.includes(q.slug) &&
        q.topics.some((slug) => (company.topicWeights[slug] ?? 0) >= 70) &&
        q.difficulty === company.difficultyBias,
    ).slice(0, Math.max(0, 40 - tagged.length));

    const chosen = [...tagged, ...byWeight.map((q) => q.slug)];

    await db.companyQuestion.deleteMany({ where: { companyId: row.id } });
    await db.companyQuestion.createMany({
      data: chosen
        .map((slug) => questionIds.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((questionId, index) => ({
          companyId: row.id,
          questionId,
          confidence: "COMPANY_STYLE" as const,
          frequency: Math.max(1, 10 - Math.floor(index / 4)),
        }))
    });
  }

  console.log(`  companies       ${COMPANIES.length}`);
}

async function seedAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    await db.achievement.upsert({
      where: { slug: achievement.slug },
      create: {
        slug: achievement.slug,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        tier: achievement.tier,
        xpReward: achievement.xpReward,
        criteria: achievement.criteria as never,
        orderIndex: achievement.orderIndex,
      },
      update: {
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        tier: achievement.tier,
        xpReward: achievement.xpReward,
        criteria: achievement.criteria as never,
        orderIndex: achievement.orderIndex,
      },
    });
  }
  console.log(`  achievements    ${ACHIEVEMENTS.length}`);
}

async function seedUniversity() {
  const university = await db.university.upsert({
    where: { slug: DEV_UNIVERSITY.slug },
    create: DEV_UNIVERSITY,
    update: { name: DEV_UNIVERSITY.name, city: DEV_UNIVERSITY.city },
    select: { id: true, joinCode: true, name: true },
  });

  await db.universityClass.deleteMany({ where: { universityId: university.id } });
  const classRow = await db.universityClass.create({
    data: {
      universityId: university.id,
      name: "TE Computer Engineering",
      department: "Computer Science",
      year: "3rd Year",
      division: "A",
      subject: "Data Structures and Algorithms",
      capacity: 60,
    },
    select: { id: true },
  });

  // A faculty account is only created once a real person signs in and is
  // promoted; the seed prepares the institution, its class and its question
  // bank so that promotion is the only manual step.
  const anyFaculty = await db.universityMember.findFirst({
    where: { universityId: university.id, role: { in: ["FACULTY", "HOD", "ADMIN"] } },
    select: { userId: true },
  });

  if (!anyFaculty) {
    console.log(
      `  university      ${university.name} (join code ${university.joinCode}) — no faculty yet`,
    );
    console.log(
      "                  promote an account with: npm run make:faculty -- <email>",
    );
    return;
  }

  const existing = await db.universityQuestion.count({ where: { universityId: university.id } });
  if (existing === 0) {
    for (const question of DEV_UNIVERSITY_QUESTIONS) {
      await db.universityQuestion.create({
        data: {
          universityId: university.id,
          createdById: anyFaculty.userId,
          title: question.title,
          description: question.description,
          topic: question.topic,
          difficulty: question.difficulty,
          inputFormat: question.inputFormat,
          outputFormat: question.outputFormat,
          constraints: question.constraints,
          sampleInput: question.sampleInput,
          sampleOutput: question.sampleOutput,
          examples: [{ input: question.sampleInput, output: question.sampleOutput }] as never,
          starterCode: GENERIC_STARTER as never,
          defaultMarks: question.defaultMarks,
          testCases: {
            create: question.testCases.map((testCase, index) => ({
              kind: testCase.kind,
              orderIndex: index,
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              points: testCase.points,
            })),
          },
        },
      });
    }
  }

  const bank = await db.universityQuestion.findMany({
    where: { universityId: university.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, defaultMarks: true },
  });

  const existingTest = await db.universityTest.findFirst({
    where: { universityId: university.id, name: "DSA Internal Assessment I" },
    select: { id: true },
  });

  if (!existingTest && bank.length > 0) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    await db.universityTest.create({
      data: {
        universityId: university.id,
        createdById: anyFaculty.userId,
        classId: classRow.id,
        name: "DSA Internal Assessment I",
        description: "Covers arrays, hashing and strings.",
        subject: "Data Structures and Algorithms",
        className: "TE Computer Engineering",
        division: "A",
        startTime: start,
        endTime: end,
        durationMinutes: 60,
        capacity: 50,
        totalMarks: bank.reduce((sum, q) => sum + q.defaultMarks, 0),
        passingMarks: 40,
        status: "DRAFT",
        instructions:
          "Read every question carefully. Your code is auto-saved. Use Run to check the public test cases and Submit to have a question marked. The assessment submits automatically when the timer reaches zero.",
        questions: {
          create: bank.map((question, index) => ({
            questionId: question.id,
            marks: question.defaultMarks,
            orderIndex: index,
          })),
        },
      },
    });
  }

  console.log(
    `  university      ${university.name} (join code ${university.joinCode}), ${bank.length} bank questions`,
  );
}

async function main() {
  // Name the target: seeding the wrong database — the local file when you meant
  // the deployment, or the reverse — is otherwise silent until much later.
  console.log(`\nSeeding DSA Forge into ${describeTarget()}\n`);

  await seedTopics();
  const questionIds = await seedQuestions();
  await seedCompanies(questionIds);
  await seedAchievements();
  await seedUniversity();

  const published = await db.question.groupBy({
    by: ["difficulty"],
    where: { isPublished: true },
    _count: { _all: true },
  });

  console.log("\nPublished catalogue");
  for (const level of ["EASY", "MEDIUM", "HARD"] as const) {
    const count = published.find((row) => row.difficulty === level)?._count._all ?? 0;
    const ok = count === 100 ? "ok" : "MISMATCH";
    console.log(`  ${level.padEnd(8)} ${String(count).padStart(3)}  ${ok}`);
  }

  console.log("\nDone.\n");
}

main()
  .catch((error) => {
    console.error("\nSeed failed:\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
