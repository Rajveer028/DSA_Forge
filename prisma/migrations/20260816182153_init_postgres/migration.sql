-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('C', 'CPP', 'JAVA', 'PYTHON');

-- CreateEnum
CREATE TYPE "DsaLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CareerGoal" AS ENUM ('LEARN_DSA', 'UNIVERSITY_PREP', 'PLACEMENT_PREP', 'PRODUCT_COMPANY', 'SERVICE_COMPANY', 'COMPETITIVE_PROGRAMMING', 'INTERVIEW_PREP');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('STUDENT', 'FACULTY', 'ADMIN');

-- CreateEnum
CREATE TYPE "UniversityRole" AS ENUM ('STUDENT', 'FACULTY', 'HOD', 'ADMIN');

-- CreateEnum
CREATE TYPE "TestCaseKind" AS ENUM ('SAMPLE', 'HIDDEN', 'EDGE', 'STRESS');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED', 'INTERNAL_ERROR');

-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('RUN', 'SUBMIT', 'UNIVERSITY', 'VALIDATION');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'COMPILING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('NOT_ATTEMPTED', 'ATTEMPTED', 'SOLVED');

-- CreateEnum
CREATE TYPE "CompanyCategory" AS ENUM ('PRODUCT', 'SERVICE', 'STARTUP', 'FINTECH', 'CONSULTING', 'CORE', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('CURATED', 'AI_GENERATED', 'FACULTY', 'IMPORTED');

-- CreateEnum
CREATE TYPE "SourceConfidence" AS ENUM ('VERIFIED_HISTORICAL', 'COMPANY_STYLE', 'AI_PATTERN');

-- CreateEnum
CREATE TYPE "AIQuestionStatus" AS ENUM ('DRAFT', 'VALIDATING', 'VALIDATION_FAILED', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RecommendationKind" AS ENUM ('NEXT_PROBLEM', 'TOPIC_FOCUS', 'DIFFICULTY_SHIFT', 'REVISION', 'COMPANY_PREP', 'LEARNING_PATH_STEP');

-- CreateEnum
CREATE TYPE "UniversityTestStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TestAttemptStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'ABSENT');

-- CreateEnum
CREATE TYPE "SimilarityVerdict" AS ENUM ('LOW', 'MODERATE', 'REVIEW_RECOMMENDED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('TEST_SCHEDULED', 'TEST_STARTING', 'RESULT_PUBLISHED', 'AI_RECOMMENDATION', 'ACHIEVEMENT_UNLOCKED', 'STREAK_REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('MILESTONE', 'STREAK', 'DIFFICULTY', 'TOPIC', 'INTERVIEW', 'UNIVERSITY');

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "college" TEXT,
    "degree" TEXT,
    "branch" TEXT,
    "academicYear" TEXT,
    "rollNumber" TEXT,
    "languages" JSONB,
    "dsaLevel" "DsaLevel" NOT NULL DEFAULT 'BEGINNER',
    "careerGoals" JSONB,
    "role" "PlatformRole" NOT NULL DEFAULT 'STUDENT',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "editorTheme" TEXT NOT NULL DEFAULT 'forge-dark',
    "editorFontSize" INTEGER NOT NULL DEFAULT 14,
    "defaultLanguage" "Language" NOT NULL DEFAULT 'CPP',
    "tabSize" INTEGER NOT NULL DEFAULT 4,
    "showLineNumbers" BOOLEAN NOT NULL DEFAULT true,
    "autoSaveCode" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "streakReminders" BOOLEAN NOT NULL DEFAULT true,
    "aiHintsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 45,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_topic_interests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_topic_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "inputFormat" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "notes" TEXT,
    "examples" JSONB,
    "starterCode" JSONB,
    "solutions" JSONB,
    "hints" JSONB,
    "editorial" TEXT,
    "approach" TEXT,
    "intuition" TEXT,
    "algorithmSteps" JSONB,
    "timeComplexity" TEXT,
    "spaceComplexity" TEXT,
    "supportedLanguages" JSONB,
    "languageTags" TEXT NOT NULL DEFAULT ',C,CPP,JAVA,PYTHON,',
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 256,
    "source" "QuestionSource" NOT NULL DEFAULT 'CURATED',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_topics" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "kind" "TestCaseKind" NOT NULL DEFAULT 'HIDDEN',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "runtimeMs" INTEGER,
    "memoryKb" INTEGER,
    "compileLog" TEXT,
    "errorMessage" TEXT,
    "testResults" JSONB,
    "timeComplexity" TEXT,
    "spaceComplexity" TEXT,
    "aiAnalysis" TEXT,
    "aiExplanation" TEXT,
    "answerRevealed" BOOLEAN NOT NULL DEFAULT false,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_executions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT,
    "universityQuestionId" TEXT,
    "submissionId" TEXT,
    "universitySubmissionId" TEXT,
    "mode" "ExecutionMode" NOT NULL DEFAULT 'RUN',
    "language" "Language" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "runtimeMs" INTEGER,
    "memoryKb" INTEGER,
    "exitCode" INTEGER,
    "compileLog" TEXT,
    "stderr" TEXT,
    "results" JSONB,
    "verdict" "SubmissionStatus",
    "workerId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL DEFAULT 'NOT_ATTEMPTED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "answerRevealed" BOOLEAN NOT NULL DEFAULT false,
    "bestRuntimeMs" INTEGER,
    "bestMemoryKb" INTEGER,
    "totalTimeSec" INTEGER NOT NULL DEFAULT 0,
    "lastLanguage" "Language",
    "lastCode" TEXT,
    "firstAttemptedAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),
    "lastAttemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CompanyCategory" NOT NULL DEFAULT 'PRODUCT',
    "logoEmoji" TEXT,
    "brandColor" TEXT,
    "description" TEXT,
    "hiringNotes" TEXT,
    "difficultyBias" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_questions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "confidence" "SourceConfidence" NOT NULL DEFAULT 'COMPANY_STYLE',
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "round" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_topic_weights" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "company_topic_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_preps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL DEFAULT 0,
    "solvedCount" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL DEFAULT 40,
    "strongTopics" JSONB,
    "weakTopics" JSONB,
    "lastAnalyzedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_company_preps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_questions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "prompt" TEXT NOT NULL,
    "topicSlug" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "model" TEXT,
    "provider" TEXT,
    "payload" JSONB NOT NULL,
    "validationReport" JSONB,
    "status" "AIQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "failureReason" TEXT,
    "publishedQuestionId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RecommendationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rationale" TEXT,
    "questionId" TEXT,
    "companyId" TEXT,
    "topicSlug" TEXT,
    "difficulty" "Difficulty",
    "priority" INTEGER NOT NULL DEFAULT 50,
    "stepIndex" INTEGER,
    "isPath" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_hints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSolved" INTEGER NOT NULL DEFAULT 0,
    "totalAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "acceptedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "easySolved" INTEGER NOT NULL DEFAULT 0,
    "mediumSolved" INTEGER NOT NULL DEFAULT 0,
    "hardSolved" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastSolvedOn" TIMESTAMP(3),
    "codingSeconds" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "answersRevealed" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "activity" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "solved" INTEGER NOT NULL DEFAULT 0,
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimeSec" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "masteryScore" INTEGER NOT NULL DEFAULT 0,
    "isStrong" BOOLEAN NOT NULL DEFAULT false,
    "isWeak" BOOLEAN NOT NULL DEFAULT false,
    "lastPracticedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL DEFAULT 'MILESTONE',
    "icon" TEXT NOT NULL DEFAULT 'Trophy',
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "criteria" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 1,
    "unlockedAt" TIMESTAMP(3),
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "city" TEXT,
    "logoUrl" TEXT,
    "joinCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_members" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UniversityRole" NOT NULL DEFAULT 'STUDENT',
    "department" TEXT,
    "year" TEXT,
    "division" TEXT,
    "batch" TEXT,
    "rollNumber" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_classes" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "year" TEXT,
    "division" TEXT,
    "batch" TEXT,
    "subject" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_class_members" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "university_class_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_questions" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "inputFormat" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "examples" JSONB,
    "sampleInput" TEXT,
    "sampleOutput" TEXT,
    "starterCode" JSONB,
    "solutions" JSONB,
    "defaultMarks" INTEGER NOT NULL DEFAULT 20,
    "timeLimitMs" INTEGER NOT NULL DEFAULT 2000,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 256,
    "supportedLanguages" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_test_cases" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "kind" "TestCaseKind" NOT NULL DEFAULT 'HIDDEN',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_tests" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "className" TEXT,
    "division" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "passingMarks" INTEGER NOT NULL DEFAULT 40,
    "joinCode" TEXT,
    "joinOpen" BOOLEAN NOT NULL DEFAULT true,
    "status" "UniversityTestStatus" NOT NULL DEFAULT 'DRAFT',
    "instructions" TEXT,
    "allowedLanguages" JSONB,
    "partialScoring" BOOLEAN NOT NULL DEFAULT true,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "resultsPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_test_questions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "marks" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "university_test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_test_students" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TestAttemptStatus" NOT NULL DEFAULT 'ASSIGNED',
    "rollNumber" TEXT,
    "startedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "flags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_test_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_submissions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxMarks" INTEGER NOT NULL DEFAULT 0,
    "runtimeMs" INTEGER,
    "memoryKb" INTEGER,
    "compileLog" TEXT,
    "testResults" JSONB,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "autoSaved" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_results" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionsSolved" INTEGER NOT NULL DEFAULT 0,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "breakdown" JSONB,
    "timeTakenSec" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_similarity_reports" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "userAName" TEXT NOT NULL,
    "userBName" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "tokenSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "structuralSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verdict" "SimilarityVerdict" NOT NULL DEFAULT 'LOW',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_similarity_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_schedules" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "succeeded" BOOLEAN,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "icon" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_email_key" ON "user_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_clerkUserId_key" ON "user_accounts"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_accountId_idx" ON "auth_sessions"("accountId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_accountId_key" ON "user_profiles"("accountId");

-- CreateIndex
CREATE INDEX "user_profiles_role_idx" ON "user_profiles"("role");

-- CreateIndex
CREATE INDEX "user_profiles_college_idx" ON "user_profiles"("college");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_orderIndex_idx" ON "topics"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "user_topic_interests_userId_topicId_key" ON "user_topic_interests"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_slug_key" ON "questions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "questions_number_key" ON "questions"("number");

-- CreateIndex
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateIndex
CREATE INDEX "questions_isPublished_difficulty_idx" ON "questions"("isPublished", "difficulty");

-- CreateIndex
CREATE INDEX "questions_number_idx" ON "questions"("number");

-- CreateIndex
CREATE INDEX "question_topics_topicId_idx" ON "question_topics"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "question_topics_questionId_topicId_key" ON "question_topics"("questionId", "topicId");

-- CreateIndex
CREATE INDEX "test_cases_questionId_kind_idx" ON "test_cases"("questionId", "kind");

-- CreateIndex
CREATE INDEX "submissions_userId_questionId_idx" ON "submissions"("userId", "questionId");

-- CreateIndex
CREATE INDEX "submissions_userId_status_idx" ON "submissions"("userId", "status");

-- CreateIndex
CREATE INDEX "submissions_questionId_status_idx" ON "submissions"("questionId", "status");

-- CreateIndex
CREATE INDEX "submissions_submittedAt_idx" ON "submissions"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "code_executions_submissionId_key" ON "code_executions"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "code_executions_universitySubmissionId_key" ON "code_executions"("universitySubmissionId");

-- CreateIndex
CREATE INDEX "code_executions_status_queuedAt_idx" ON "code_executions"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "code_executions_userId_createdAt_idx" ON "code_executions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "question_attempts_userId_outcome_idx" ON "question_attempts"("userId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "question_attempts_userId_questionId_key" ON "question_attempts"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_category_isActive_idx" ON "companies"("category", "isActive");

-- CreateIndex
CREATE INDEX "company_questions_questionId_idx" ON "company_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "company_questions_companyId_questionId_key" ON "company_questions"("companyId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "company_topic_weights_companyId_topicId_key" ON "company_topic_weights"("companyId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_preps_userId_companyId_key" ON "user_company_preps"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_questions_publishedQuestionId_key" ON "ai_questions"("publishedQuestionId");

-- CreateIndex
CREATE INDEX "ai_questions_status_createdAt_idx" ON "ai_questions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ai_recommendations_userId_dismissed_priority_idx" ON "ai_recommendations"("userId", "dismissed", "priority");

-- CreateIndex
CREATE INDEX "ai_recommendations_userId_isPath_stepIndex_idx" ON "ai_recommendations"("userId", "isPath", "stepIndex");

-- CreateIndex
CREATE INDEX "ai_hints_userId_createdAt_idx" ON "ai_hints"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_hints_userId_questionId_level_key" ON "ai_hints"("userId", "questionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "learning_progress_userId_key" ON "learning_progress"("userId");

-- CreateIndex
CREATE INDEX "topic_progress_userId_masteryScore_idx" ON "topic_progress"("userId", "masteryScore");

-- CreateIndex
CREATE UNIQUE INDEX "topic_progress_userId_topicId_key" ON "topic_progress"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_slug_key" ON "achievements"("slug");

-- CreateIndex
CREATE INDEX "user_achievements_userId_unlockedAt_idx" ON "user_achievements"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "universities_joinCode_key" ON "universities"("joinCode");

-- CreateIndex
CREATE INDEX "university_members_universityId_role_idx" ON "university_members"("universityId", "role");

-- CreateIndex
CREATE INDEX "university_members_universityId_year_division_idx" ON "university_members"("universityId", "year", "division");

-- CreateIndex
CREATE UNIQUE INDEX "university_members_universityId_userId_key" ON "university_members"("universityId", "userId");

-- CreateIndex
CREATE INDEX "university_classes_universityId_idx" ON "university_classes"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "university_class_members_classId_memberId_key" ON "university_class_members"("classId", "memberId");

-- CreateIndex
CREATE INDEX "university_questions_universityId_isArchived_idx" ON "university_questions"("universityId", "isArchived");

-- CreateIndex
CREATE INDEX "university_questions_universityId_difficulty_idx" ON "university_questions"("universityId", "difficulty");

-- CreateIndex
CREATE INDEX "university_test_cases_questionId_kind_idx" ON "university_test_cases"("questionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "university_tests_joinCode_key" ON "university_tests"("joinCode");

-- CreateIndex
CREATE INDEX "university_tests_universityId_status_idx" ON "university_tests"("universityId", "status");

-- CreateIndex
CREATE INDEX "university_tests_startTime_idx" ON "university_tests"("startTime");

-- CreateIndex
CREATE INDEX "university_test_questions_testId_orderIndex_idx" ON "university_test_questions"("testId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "university_test_questions_testId_questionId_key" ON "university_test_questions"("testId", "questionId");

-- CreateIndex
CREATE INDEX "university_test_students_testId_status_idx" ON "university_test_students"("testId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "university_test_students_testId_userId_key" ON "university_test_students"("testId", "userId");

-- CreateIndex
CREATE INDEX "university_submissions_testId_userId_idx" ON "university_submissions"("testId", "userId");

-- CreateIndex
CREATE INDEX "university_submissions_testId_questionId_idx" ON "university_submissions"("testId", "questionId");

-- CreateIndex
CREATE INDEX "university_submissions_testId_questionId_userId_isFinal_idx" ON "university_submissions"("testId", "questionId", "userId", "isFinal");

-- CreateIndex
CREATE INDEX "university_results_testId_totalMarks_idx" ON "university_results"("testId", "totalMarks");

-- CreateIndex
CREATE UNIQUE INDEX "university_results_testId_userId_key" ON "university_results"("testId", "userId");

-- CreateIndex
CREATE INDEX "code_similarity_reports_testId_similarity_idx" ON "code_similarity_reports"("testId", "similarity");

-- CreateIndex
CREATE UNIQUE INDEX "code_similarity_reports_testId_questionId_userAId_userBId_key" ON "code_similarity_reports"("testId", "questionId", "userAId", "userBId");

-- CreateIndex
CREATE INDEX "test_schedules_runAt_executedAt_idx" ON "test_schedules"("runAt", "executedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_interests" ADD CONSTRAINT "user_topic_interests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_interests" ADD CONSTRAINT "user_topic_interests_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_executions" ADD CONSTRAINT "code_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_executions" ADD CONSTRAINT "code_executions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_executions" ADD CONSTRAINT "code_executions_universityQuestionId_fkey" FOREIGN KEY ("universityQuestionId") REFERENCES "university_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_executions" ADD CONSTRAINT "code_executions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_executions" ADD CONSTRAINT "code_executions_universitySubmissionId_fkey" FOREIGN KEY ("universitySubmissionId") REFERENCES "university_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_questions" ADD CONSTRAINT "company_questions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_questions" ADD CONSTRAINT "company_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_topic_weights" ADD CONSTRAINT "company_topic_weights_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_topic_weights" ADD CONSTRAINT "company_topic_weights_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_preps" ADD CONSTRAINT "user_company_preps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_preps" ADD CONSTRAINT "user_company_preps_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_questions" ADD CONSTRAINT "ai_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_questions" ADD CONSTRAINT "ai_questions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_questions" ADD CONSTRAINT "ai_questions_publishedQuestionId_fkey" FOREIGN KEY ("publishedQuestionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_hints" ADD CONSTRAINT "ai_hints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_hints" ADD CONSTRAINT "ai_hints_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_members" ADD CONSTRAINT "university_members_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_members" ADD CONSTRAINT "university_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_classes" ADD CONSTRAINT "university_classes_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_class_members" ADD CONSTRAINT "university_class_members_classId_fkey" FOREIGN KEY ("classId") REFERENCES "university_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_class_members" ADD CONSTRAINT "university_class_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "university_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_questions" ADD CONSTRAINT "university_questions_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_test_cases" ADD CONSTRAINT "university_test_cases_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "university_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_tests" ADD CONSTRAINT "university_tests_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_tests" ADD CONSTRAINT "university_tests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_tests" ADD CONSTRAINT "university_tests_classId_fkey" FOREIGN KEY ("classId") REFERENCES "university_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_test_questions" ADD CONSTRAINT "university_test_questions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "university_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_test_questions" ADD CONSTRAINT "university_test_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "university_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_test_students" ADD CONSTRAINT "university_test_students_testId_fkey" FOREIGN KEY ("testId") REFERENCES "university_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_test_students" ADD CONSTRAINT "university_test_students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_submissions" ADD CONSTRAINT "university_submissions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "university_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_submissions" ADD CONSTRAINT "university_submissions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "university_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_submissions" ADD CONSTRAINT "university_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_results" ADD CONSTRAINT "university_results_testId_fkey" FOREIGN KEY ("testId") REFERENCES "university_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_results" ADD CONSTRAINT "university_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_similarity_reports" ADD CONSTRAINT "code_similarity_reports_testId_fkey" FOREIGN KEY ("testId") REFERENCES "university_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_schedules" ADD CONSTRAINT "test_schedules_testId_fkey" FOREIGN KEY ("testId") REFERENCES "university_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
