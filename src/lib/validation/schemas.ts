import { z } from "zod";

/**
 * Every payload crossing a trust boundary is parsed here first.
 * Client-supplied ids, roles, marks and verdicts are never accepted verbatim —
 * these schemas only allow the fields the server is willing to act on.
 */

export const languageSchema = z.enum(["C", "CPP", "JAVA", "PYTHON"]);
export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const testCaseKindSchema = z.enum(["SAMPLE", "HIDDEN", "EDGE", "STRESS"]);

const MAX_CODE_BYTES = 100_000;

export const codeSchema = z
  .string()
  .min(1, "Write some code before running it.")
  .max(MAX_CODE_BYTES, "Your code exceeds the 100 KB limit.");

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name.").max(80),
  college: z.string().min(2, "Please enter your college or university.").max(120),
  degree: z.string().min(1, "Select a degree.").max(80),
  branch: z.string().min(1, "Select a branch.").max(80),
  academicYear: z.string().min(1, "Select your academic year.").max(40),
  rollNumber: z.string().max(40).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  languages: z.array(languageSchema).min(1, "Pick at least one language."),
  dsaLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  topics: z.array(z.string().min(1)).min(1, "Pick at least one topic."),
  careerGoals: z
    .array(
      z.enum([
        "LEARN_DSA",
        "UNIVERSITY_PREP",
        "PLACEMENT_PREP",
        "PRODUCT_COMPANY",
        "SERVICE_COMPANY",
        "COMPETITIVE_PROGRAMMING",
        "INTERVIEW_PREP",
      ]),
    )
    .min(1, "Pick at least one goal."),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------

export const runCodeSchema = z.object({
  questionId: z.string().min(1),
  language: languageSchema,
  code: codeSchema,
});

export const submitCodeSchema = runCodeSchema.extend({
  timeSpentSec: z.number().int().min(0).max(86_400).optional(),
});

export const hintSchema = z.object({
  questionId: z.string().min(1),
  level: z.number().int().min(1).max(3),
});

export const revealSchema = z.object({
  questionId: z.string().min(1),
});

export const analyzeSchema = z.object({
  submissionId: z.string().min(1),
  kind: z.enum(["analysis", "explanation"]).default("analysis"),
});

export const questionQuerySchema = z.object({
  difficulty: difficultySchema.optional(),
  topic: z.string().optional(),
  status: z.enum(["ALL", "NOT_ATTEMPTED", "ATTEMPTED", "SOLVED"]).default("ALL"),
  language: languageSchema.optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export const preferencesSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  editorFontSize: z.number().int().min(11).max(24).optional(),
  defaultLanguage: languageSchema.optional(),
  tabSize: z.number().int().min(2).max(8).optional(),
  showLineNumbers: z.boolean().optional(),
  autoSaveCode: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  streakReminders: z.boolean().optional(),
  aiHintsEnabled: z.boolean().optional(),
  dailyGoalMinutes: z.number().int().min(10).max(600).optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  college: z.string().max(120).optional(),
  degree: z.string().max(80).optional(),
  branch: z.string().max(80).optional(),
  academicYear: z.string().max(40).optional(),
  rollNumber: z.string().max(40).optional(),
  dsaLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  languages: z.array(languageSchema).optional(),
  careerGoals: z
    .array(
      z.enum([
        "LEARN_DSA",
        "UNIVERSITY_PREP",
        "PLACEMENT_PREP",
        "PRODUCT_COMPANY",
        "SERVICE_COMPANY",
        "COMPETITIVE_PROGRAMMING",
        "INTERVIEW_PREP",
      ]),
    )
    .optional(),
  topics: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export const generateQuestionSchema = z.object({
  companyId: z.string().optional(),
  topic: z.string().min(1),
  difficulty: difficultySchema,
  count: z.number().int().min(1).max(3).default(1),
  language: languageSchema.default("CPP"),
  style: z.enum(["standard", "interview", "contest"]).default("standard"),
});

export const generateVariationSchema = z.object({
  questionId: z.string().min(1),
  variant: z.enum(["easier", "same", "harder", "constraints", "format", "interview"]),
});

export const companyPrepSchema = z.object({
  companyId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// University — faculty
// ---------------------------------------------------------------------------

export const universityQuestionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(4, "Give the question a title.").max(160),
  description: z.string().min(20, "Describe the problem in at least 20 characters."),
  topic: z.string().min(1),
  difficulty: difficultySchema,
  inputFormat: z.string().min(1),
  outputFormat: z.string().min(1),
  constraints: z.string().min(1),
  sampleInput: z.string().optional(),
  sampleOutput: z.string().optional(),
  defaultMarks: z.number().int().min(1).max(200).default(20),
  timeLimitMs: z.number().int().min(500).max(10_000).default(2000),
  memoryLimitMb: z.number().int().min(32).max(512).default(256),
  supportedLanguages: z.array(languageSchema).min(1),
  solutions: z.record(languageSchema, z.string()).optional(),
  testCases: z
    .array(
      z.object({
        kind: testCaseKindSchema,
        input: z.string(),
        expectedOutput: z.string(),
        points: z.number().int().min(0).max(100).default(1),
        explanation: z.string().optional(),
      }),
    )
    .min(1, "Add at least one test case."),
});

export const createTestSchema = z
  .object({
    name: z.string().min(3, "Name the assessment.").max(160),
    description: z.string().max(2000).optional(),
    subject: z.string().max(120).optional(),
    className: z.string().max(120).optional(),
    division: z.string().max(40).optional(),
    classId: z.string().optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    durationMinutes: z.number().int().min(5).max(600),
    capacity: z.number().int().min(1).max(2000),
    totalMarks: z.number().int().min(1).max(1000),
    passingMarks: z.number().int().min(0).max(1000),
    instructions: z.string().max(4000).optional(),
    allowedLanguages: z.array(languageSchema).min(1),
    partialScoring: z.boolean().default(true),
    shuffleQuestions: z.boolean().default(false),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "The end time must be after the start time.",
    path: ["endTime"],
  })
  .refine((data) => data.passingMarks <= data.totalMarks, {
    message: "Passing marks cannot exceed total marks.",
    path: ["passingMarks"],
  });

export const testQuestionsSchema = z.object({
  testId: z.string().min(1),
  questions: z
    .array(
      z.object({
        questionId: z.string().min(1),
        marks: z.number().int().min(1).max(500),
      }),
    )
    .min(1, "Add at least one question."),
});

export const assignStudentsSchema = z.object({
  testId: z.string().min(1),
  userIds: z.array(z.string()).default([]),
  filters: z
    .object({
      department: z.string().optional(),
      year: z.string().optional(),
      division: z.string().optional(),
      batch: z.string().optional(),
      classId: z.string().optional(),
    })
    .optional(),
  replace: z.boolean().default(false),
});

export const testStatusSchema = z.object({
  testId: z.string().min(1),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]),
});

export const importQuestionsSchema = z.object({
  questions: z.array(universityQuestionSchema.omit({ id: true })).min(1).max(100),
});

/**
 * One-shot test creation: settings, the paper and the roster size together.
 *
 * `catalogQuestionIds` are Practice Arena problems to copy in; `customQuestions`
 * are written by the host on the spot. Either list may be empty, but a test
 * that ends up with no questions at all is rejected by the route.
 */
export const quickTestSchema = z
  .object({
    name: z.string().min(3, "Name the assessment.").max(160),
    description: z.string().max(2000).optional(),
    subject: z.string().max(120).optional(),
    durationMinutes: z.number().int().min(5).max(600),
    capacity: z.number().int().min(1).max(2000),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    passingPercent: z.number().int().min(0).max(100).default(40),
    marksPerQuestion: z.number().int().min(1).max(200).default(20),
    instructions: z.string().max(4000).optional(),
    allowedLanguages: z.array(languageSchema).min(1),
    partialScoring: z.boolean().default(true),
    shuffleQuestions: z.boolean().default(false),
    catalogQuestionIds: z.array(z.string().min(1)).max(50).default([]),
    customQuestions: z
      .array(universityQuestionSchema.omit({ id: true }))
      .max(50)
      .default([]),
    /** Publish immediately so the code works right away. */
    publish: z.boolean().default(true),
  })
  .refine((data) => !data.endTime || !data.startTime || data.endTime > data.startTime, {
    message: "The end time must be after the start time.",
    path: ["endTime"],
  });

export const joinTestSchema = z.object({
  code: z.string().min(4, "Enter the test code.").max(32),
});

// ---------------------------------------------------------------------------
// University — student
// ---------------------------------------------------------------------------

export const startTestSchema = z.object({ testId: z.string().min(1) });

export const testRunSchema = z.object({
  testId: z.string().min(1),
  questionId: z.string().min(1),
  language: languageSchema,
  code: codeSchema,
});

export const testAutoSaveSchema = z.object({
  testId: z.string().min(1),
  questionId: z.string().min(1),
  language: languageSchema,
  code: z.string().max(MAX_CODE_BYTES),
  markedForReview: z.boolean().optional(),
});

export const finalSubmitSchema = z.object({ testId: z.string().min(1) });

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export const searchSchema = z.object({
  q: z.string().min(1).max(120),
});

export const notificationReadSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export const joinUniversitySchema = z.object({
  joinCode: z.string().min(4).max(24),
  rollNumber: z.string().max(40).optional(),
  department: z.string().max(80).optional(),
  year: z.string().max(40).optional(),
  division: z.string().max(40).optional(),
});
