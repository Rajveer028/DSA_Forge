# DSA Forge: An Integrated Platform for Algorithmic Practice, Company-Focused Interview Preparation, and University Coding Assessment

**A technical research paper on the architecture, pedagogy, trust model, and product design of the DSA Forge website**

---

**Product.** DSA Forge  
**Tagline.** Forge Your DSA Skills. Crack Your Dream Interview.  
**Version studied.** 1.0.0 (codebase as of 26 September 2026)  
**Repository.** Local Next.js application at the DSA Forge workspace  
**Classification.** Systems paper / product-architecture monograph (not a peer-reviewed empirical study)

---

## Abstract

DSA Forge is a single web product that unifies three historically separate surfaces of computer-science education: (1) a LeetCode-style **Practice Arena** of three hundred curated algorithmic problems with a real compiler-and-judge pipeline; (2) an **AI Interview Prep** portal that maps a learner’s verified submission history onto company-specific topic weights and a readiness score; and (3) a **University Assessment** portal in which faculty (or any signed-in host) author problems, schedule timed papers, auto-mark submissions, rank a cohort, and receive structural similarity reports as a *review indicator* rather than an accusation of misconduct.

This paper documents the entire system as implemented. It covers product intent, information architecture, identity (Clerk plus a local account mirror, with a password fallback), the Prisma/PostgreSQL data model (thirty-seven mapped models and a large enum surface), catalogue integrity (reference solutions that *generate* expected outputs), the sandboxed execution and judging pipeline, adaptive recommendation when AI is absent, the AI provider abstraction and generated-question validation gates, university lifecycle and server-authoritative timers, rate limiting and Zod trust-boundary schemas, visual design, deployment constraints (notably Vercel versus Docker workers), and known limitations.

The central engineering thesis of the product is explicit in both the README and the source: **nothing that decides an outcome is accepted from the client.** Verdicts, pass counts, solved status, marks, attempt windows, test ownership, and student assignment are computed or verified server-side. Hidden test data never reaches the browser. Submitted code never runs in the Next.js process in production. AI-generated problems are not trusted until a sandbox run of a reference solution rewrites or confirms expected outputs.

---

## 1. Introduction

### 1.1 Motivation

Undergraduate and early-career software engineers in India and globally prepare for placements on a fragmented stack: one site for problem drills, another for company-wise lists of uncertain provenance, a learning-management system or Google Form for campus tests, and a separate online judge (or none at all) for auto-marking. That fragmentation produces three failures:

1. **Pedagogical discontinuity.** Practice history does not inform interview plans; interview plans do not inform what a faculty member should assess.
2. **Integrity theatre.** Many “judges” run code in the application process, leak hidden cases to the client, or trust a browser clock for exam duration.
3. **AI without a gate.** Generative models can emit plausible problem statements whose sample outputs do not match any executable specification.

DSA Forge is designed as one authenticated product with a persistent sidebar in which those three portals are always one click away, sharing a single learner profile, progress ledger, and execution pipeline.

### 1.2 Research questions this paper answers from the code

This document is an *as-built* study. It answers:

- What is the product, and how is it organised for users of different roles?
- How does identity, onboarding, and authorisation actually work?
- What is stored, and how do models relate?
- How is the 300-problem catalogue constructed so the answer key cannot drift?
- How does Run versus Submit versus university execution differ?
- How is isolation achieved for untrusted code?
- How do adaptive plans and company readiness work with and without an AI key?
- How does university assessment enforce time, assignment, marking, and similarity review?
- What is the security and validation model at every trust boundary?
- How is the website presented (IA, design system, components)?
- What remains unfinished or explicitly out of scope?

### 1.3 Method

The study is a full-repository reading of application source (`src/`), Prisma schema and seed (`prisma/`), sandbox worker (`sandbox/`), and operational documentation (`README.md`, `DEPLOYMENT.md`). Behaviour is described as implemented, not as marketing copy alone. Where README and schema disagree on counts (for example model count), the schema is treated as authoritative.

---

## 2. Product vision and positioning

### 2.1 Positioning statement

DSA Forge presents itself as an **AI-powered platform for DSA practice, company-focused interview preparation, and university coding assessments**. It is not a general MOOC, not a social network, and not a competitive-programming contest host in the Codeforces sense (there is no public rating ladder or live contest round). Competitive programming appears as a *company/track* with high weights on DP, graphs, advanced algorithms, and number theory.

### 2.2 The three portals

| Portal | Route | Accent in UI | Stated purpose |
| --- | --- | --- | --- |
| Practice Arena | `/practice` | Forge blue | 300 curated problems; Monaco; C / C++ / Java / Python; Run samples; Submit hidden suite; hints; Reveal Answer; history |
| AI Interview Prep | `/interview-prep` | Purple (`ai`) | Company pick, readiness from real history, strong/weak topics, plan, optional generation through a validation pipeline |
| University Assessment | `/university` | Green (`success`) | Authoring, scheduling, timed sitting, auto-mark, rank, analytics, similarity review |

A fourth operational surface, **Admin** (`/admin`), is not a learner portal. It is `adminOnly` in the sidebar and gated by `PlatformRole.ADMIN`.

Supporting surfaces: Dashboard, Progress, Achievements, Profile, Settings.

### 2.3 Honesty constraints as product features

Two honesty rules are first-class, not footnotes:

**Company labelling.** The product never claims a problem was actually asked at a company unless provenance is `VERIFIED_HISTORICAL`. Seeded associations are `COMPANY_STYLE`. A third level, `AI_PATTERN`, exists for generated drills. The UI is specified to surface this verbatim.

**Generated problems.** Pipeline: generation → schema → consistency → test cases → reference solution executed → difficulty → draft → (optional admin) publish. The decisive gate is **solution**: the model’s reference implementation is compiled and run in the sandbox against the cases it produced. Expected outputs that disagree are rewritten from the verified run; failures stay drafts.

### 2.4 Related systems (qualitative)

Without claiming an empirical user study, the architecture can be placed relative to well-known categories:

- **Online judges (LeetCode, Hackerrank, SPOJ).** Shared: languages, hidden tests, verdict taxonomy. Distinct: university LMS-like assessment, company readiness with labelled provenance, optional AI with deterministic fallback.
- **LMS / exam tools (Moodle, Google Classroom + manual marking).** Shared: cohorts and timed windows. Distinct: real compile-run-judge, partial scoring, similarity as review not plagiarism court.
- **Interview-prep chatbots.** Shared: hints and plans. Distinct: plans grounded in the same `LearningProgress` / `TopicProgress` that the judge writes; product still works if `AI_API_KEY` is unset.

---

## 3. System architecture

### 3.1 Layered view

```
Browser (React 19, Monaco, Recharts, next-themes)
        │  HTTPS
Next.js 16 App Router
  • Server Components for pages (force-dynamic inside the app shell)
  • Route handlers (Node runtime) behind handler() error mapping
  • Server actions for onboarding / settings / auth fallbacks
  • proxy.ts (Clerk middleware or local session cookie)
        │
  lib/auth  →  UserAccount + UserProfile (never client-supplied user ids)
  lib/validation  →  Zod schemas (no user id, role, or score in inbound bodies)
  lib/execution  →  work queue → local driver OR remote sandbox
  lib/ai        →  AIProvider (Anthropic or OpenAI-compatible)
  lib/analytics →  progress, achievements, adaptive planner, similarity
  lib/university →  windows, evaluation, join codes, host workspace
        │
Prisma 7 + @prisma/adapter-pg
        │
Neon PostgreSQL (pooled connection recommended)
```

A **separate process**, `sandbox/server.js`, is the production execution worker. It speaks HTTP (`POST /execute`) with a bearer token and holds **no** `DATABASE_URL`, Clerk secret, or AI key.

### 3.2 Request-time versus job-time

Code execution is not performed inline as an unbounded blocking loop in a handler without a record: `createAndRunExecution` inserts a `code_executions` row (`QUEUED` → `RUNNING` → `COMPLETED`/`FAILED`), runs the job through a bounded `WorkQueue` (default concurrency 4, max pending 120), judges the sandbox result, and persists verdicts. Callers that need streaming can poll by id; the client never supplies results.

AI validation of generated problems uses `runEphemeral`, which executes without persisting an execution row.

### 3.3 Trust boundary diagram (logical)

```
Untrusted: browser, submitted source, LLM JSON payloads
Semi-trusted: Clerk identity (who you are), env configuration
Trusted: Prisma writes performed only after server-side session + Zod + permission checks
Isolated: Docker container per job (remote driver)
```

`src/proxy.ts` redirects anonymous users but is **explicitly not the security boundary**. Deleting it would cost a redirect, not a permission. Real control is `src/lib/auth/session.ts` on every page, action, and route handler.

---

## 4. Technology stack

| Layer | Choice | Notes from the codebase |
| --- | --- | --- |
| Framework | Next.js **16.3.1** App Router | `middleware` renamed to `proxy`; Server Components; Route Handlers |
| UI library | React **19.2.8** | |
| Language | TypeScript 5.9, `tsc --noEmit` | Strict project |
| Styling | Tailwind CSS **v4**, `@theme inline` tokens | Dark is default DX; `.light` is first-class |
| Primitives | Radix UI (accordion, dialog, dropdown, tabs, …) | Wrapped in `src/components/ui` |
| Icons | Lucide | |
| Motion | Framer Motion | Marketing / polish |
| Auth | `@clerk/nextjs` **7.x** | Optional; local cookie + scrypt fallback |
| Database | Neon PostgreSQL | Pooled URL for serverless |
| ORM | Prisma **7** + `prisma-client` generator | Output: `src/generated/prisma`; **driver adapter required** (`PrismaPg`) |
| Also present | `@prisma/adapter-libsql`, `@libsql/client` | Residual from SQLite era; live app path is PostgreSQL |
| Editor | Monaco (`@monaco-editor/react`, `monaco-editor`) | Languages mapped in `constants.ts` |
| Charts | Recharts 3 | Activity, donut, heatmap, topic mastery |
| Toasts | Sonner | |
| Validation | Zod **4** | All API bodies |
| Fonts | Geist / Geist Mono via `next/font` | Root layout |
| Themes | `next-themes` | `attribute="class"`, maps light/dark to `.light` / `.dark` |

**AI.** Provider-agnostic `AIProvider`. Default provider name `anthropic`, default model `claude-sonnet-5`. OpenAI-compatible endpoints via `AI_BASE_URL`. Keys never imported from Client Components (`env.ts` throws if `window` is defined).

**Execution.** Isolated Docker worker; local driver for development only, **refuses `NODE_ENV=production`**.

---

## 5. Information architecture and user journeys

### 5.1 Route groups

| Group | Path prefix | Audience | Layout behaviour |
| --- | --- | --- | --- |
| `(marketing)` | `/` | Anonymous | Public landing; hero terminal; three-portal copy |
| `(auth)` | `/sign-in`, `/sign-up` | Anonymous | Clerk catch-all pages; local form if Clerk unset |
| `onboarding` | `/onboarding` | Signed-in, incomplete profile | Five-step wizard |
| `(app)` | `/dashboard`, portals, progress, … | Onboarded users | `requireOnboarded` + `AppShell` sidebar |
| `api` | `/api/*` | Clients | JSON; 401 for anonymous API (except health) |

Public prefixes in `proxy.ts`: `/`, `/features`, `/about`, `/sign-in`, `/sign-up`, `/__clerk`, `/api/health`. Marketing mentions `/features` and `/about`; they are public if present.

Authenticated app layout is `dynamic = "force-dynamic"` so Clerk/session and unread notification counts are always fresh.

### 5.2 Application pages (complete map)

| Route | Role / access | Function |
| --- | --- | --- |
| `/` | Public | Marketing: portals, features, CTA to sign up |
| `/sign-in/[[...rest]]` | Public | Clerk or local login |
| `/sign-up/[[...rest]]` | Public | Registration |
| `/onboarding` | Signed-in | Personal info, languages, DSA level, topic interests, career goals |
| `/dashboard` | Onboarded | Stats, streak, recent attempts, recommendations, learning path, upcoming tests, activity chart |
| `/practice` | Onboarded | Difficulty tabs, filters (topic, status, language, search), pagination (`PAGE_SIZE` 25), random problem |
| `/practice/[slug]` | Onboarded | Split workspace: statement + Monaco + run/submit/hints/reveal/history |
| `/interview-prep` | Onboarded | Company grid, pinned preps, learning path, generate-problem panel if AI ready |
| `/interview-prep/[slug]` | Onboarded | Company detail: readiness, topic breakdown, recommended unsolved set, advisor |
| `/university` | Onboarded | Join university / host tests / faculty dashboard vs student dashboard |
| `/university/questions` | Faculty context | Question bank |
| `/university/questions/new` | Faculty | Author a problem |
| `/university/questions/[id]` | Faculty | Edit problem |
| `/university/tests/new`, `.../create` | Faculty / host | Paper builder |
| `/university/tests/[id]` | Owner | Test management, code, students, status |
| `/university/tests/[id]/attempt` | Assigned student | Timed assessment runner |
| `/university/tests/[id]/result` | Student (when published) | Personal result |
| `/university/tests/[id]/results` | Faculty | Cohort results, export, similarity |
| `/progress` | Onboarded | Heatmap, topic mastery, company readiness tiles, university results, XP |
| `/achievements` | Onboarded | Badge grid with progress bars |
| `/profile` | Onboarded | Profile editor |
| `/settings` | Onboarded | Theme, editor, notifications, AI hints, daily goal, password if local account |
| `/admin` | `PlatformRole.ADMIN` | Counts, env/sandbox health, recent users, AI draft review |
| Custom `not-found` | All | Branded 404 with links to dashboard and practice |

### 5.3 Navigation model

`sidebar-nav.ts` defines:

- **PRIMARY_NAV:** Dashboard  
- **PORTAL_NAV:** Practice Arena, AI Interview Prep, University Assessment (larger hit area, colour accent, description line)  
- **SECONDARY_NAV:** Progress, Achievements, Profile, Settings, Admin (`adminOnly`)

Active state uses longest-prefix match so nested university and practice routes keep the portal highlighted. Dashboard is exact-match only.

The shell supports a collapsible sidebar persisted in a cookie (`SIDEBAR_COOKIE`), a mobile drawer, global search, notifications menu, theme toggle, and sign-out.

### 5.4 Canonical user journeys

**A. New learner.** Land → sign up (Clerk or email/password) → five-step onboarding → dashboard → pick Easy in Practice Arena → open a problem → Run samples → Submit hidden → optional hint ladder → optional Reveal Answer (flagged on the attempt) → see XP/streak on dashboard.

**B. Placement candidate.** Complete some solves → Interview Prep → choose e.g. Amazon → readiness = 55% catalogue coverage + 45% weighted topic mastery → follow recommended unsolved problems labelled Company-style → refresh plan (AI narrative or deterministic engine).

**C. Faculty / host.** `make:faculty` for institutional faculty, *or* self-service “quick test” which calls `ensureHostContext` to create a personal workspace. Author or import catalogue questions, allocate `FORGE-XXXXXX` join code (unambiguous alphabet), students join, start attempt (server writes `startedAt`/`deadlineAt`), autosave, final submit, evaluate, publish results, inspect similarity pairs.

**D. Platform admin.** `ADMIN_EMAILS` on first profile create, or `--admin` on faculty grant. Review AI drafts, inspect configuration via admin page and `/api/health`.

---

## 6. Identity, sessions, and authorisation

### 6.1 Dual identity providers

Clerk owns authentication when both publishable and secret keys exist. The application **mirrors** Clerk users into `UserAccount.clerkUserId` and a `UserProfile`. Progress, submissions, and university rows hang off the local profile, not Clerk metadata. This keeps a swap small: call sites use `getAccountId()` / `getProfile()`.

If Clerk keys are absent:

- `ClerkProvider` is omitted so the app still renders (Clerk throws on mount without a key).
- `proxy.ts` uses a local session cookie (`SESSION_COOKIE`) instead of `clerkMiddleware`.
- Accounts may have `passwordHash` in the form `scrypt$N$r$p$salt$derivedKey`. Session tokens are stored only as SHA-256 hashes in `AuthSession`, so a database leak is not a replayable login.

Clerk is asked first; local session is fallback for pre-Clerk accounts and keyless deployments.

### 6.2 Profile bootstrap

`ensureProfile` creates preferences and `LearningProgress` if an account exists without a profile. `ADMIN_EMAILS` (comma-separated, lowercased) grants `PlatformRole.ADMIN` at create time.

`requireProfile` redirects to `/sign-in`.  
`requireOnboarded` additionally redirects to `/onboarding`.  
`requireAdmin` redirects to `/dashboard?error=forbidden` if not admin.  
API variants throw `UnauthorizedError` (401) / `ForbiddenError` (403).

React `cache()` wraps `getAccountId` and `getProfile` per request.

### 6.3 Roles

**PlatformRole** (`UserProfile.role`): `STUDENT` | `FACULTY` | `ADMIN`. Faculty on the *platform* is not the same as university membership; university faculty rights are **not self-service** in the documented institutional path (`npm run make:faculty -- email`). Quick-test hosting uses `ensureHostContext` so any signed-in user can still run an assessment without a university join.

**UniversityRole**: `STUDENT` | `FACULTY` | `HOD` | `ADMIN`. Faculty-or-higher for authoring is `FACULTY`, `HOD`, `ADMIN` (`isFacultyRole`). Membership requires `isApproved`.

Permissions (`permissions.ts`):

- `requireFaculty(profile, universityId?)` — server-side membership query.  
- `requireTestOwnership` — load test, then faculty of that university.  
- `requireTestAssignment` — unique `(testId, userId)` row.  
- `canViewResult` — self or faculty owner.

Roles, ownership, and assignment are **never read from the request body**.

### 6.4 Onboarding wizard (five steps)

1. **Personal information** — full name, college, degree, branch, academic year, roll number, optional image URL. Degrees and branches are curated lists (B.Tech through Diploma; CSE, IT, AI/ML, etc.). Years: 1st–4th, Postgraduate, Graduated.  
2. **Programming** — at least one of C, C++, Java, Python.  
3. **DSA experience** — Beginner / Intermediate / Advanced (`DsaLevel`).  
4. **Topics of interest** — at least one of the 21 catalogue topics.  
5. **Career goal** — at least one of: Learn DSA, University prep, Placement prep, Product company, Service company, Competitive programming, Interview prep.

`onboardingSchema` enforces lengths and enums. Completion sets `onboardingCompleted` and `onboardingStep`.

---

## 7. Data model

Storage is PostgreSQL. Scalar lists that began as SQLite JSON remain JSON by design (`src/lib/json-fields.ts`); a comma-wrapped `languageTags` string exists so Practice Arena can `contains`-filter languages without JSON operators.

Generator output: `src/generated/prisma`. Datasource: `provider = "postgresql"` (URL from env, not hardcoded in schema).

### 7.1 Enumerations (complete)

| Enum | Values | Role |
| --- | --- | --- |
| Difficulty | EASY, MEDIUM, HARD | Problems, recommendations, company bias |
| Language | C, CPP, JAVA, PYTHON | Editor, judge, submissions |
| DsaLevel | BEGINNER, INTERMEDIATE, ADVANCED | Profile |
| CareerGoal | LEARN_DSA, UNIVERSITY_PREP, PLACEMENT_PREP, PRODUCT_COMPANY, SERVICE_COMPANY, COMPETITIVE_PROGRAMMING, INTERVIEW_PREP | Profile JSON array |
| PlatformRole | STUDENT, FACULTY, ADMIN | Global |
| UniversityRole | STUDENT, FACULTY, HOD, ADMIN | Membership |
| TestCaseKind | SAMPLE, HIDDEN, EDGE, STRESS | Visibility and pedagogy of cases |
| SubmissionStatus | PENDING, RUNNING, ACCEPTED, WRONG_ANSWER, COMPILATION_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, OUTPUT_LIMIT_EXCEEDED, INTERNAL_ERROR | Judge + UI |
| ExecutionMode | RUN, SUBMIT, UNIVERSITY, VALIDATION | What suite and masking apply |
| ExecutionStatus | QUEUED, COMPILING, RUNNING, COMPLETED, FAILED, CANCELLED | Job row |
| AttemptOutcome | NOT_ATTEMPTED, ATTEMPTED, SOLVED | Per user×question rollup |
| CompanyCategory | PRODUCT, SERVICE, STARTUP, FINTECH, CONSULTING, CORE, OTHER | Company grid |
| QuestionSource | CURATED, AI_GENERATED, FACULTY, IMPORTED | Provenance of practice items |
| SourceConfidence | VERIFIED_HISTORICAL, COMPANY_STYLE, AI_PATTERN | Company–question link |
| AIQuestionStatus | DRAFT, VALIDATING, VALIDATION_FAILED, PENDING_REVIEW, PUBLISHED, REJECTED | Generation queue |
| RecommendationKind | NEXT_PROBLEM, TOPIC_FOCUS, DIFFICULTY_SHIFT, REVISION, COMPANY_PREP, LEARNING_PATH_STEP | Stored recs |
| UniversityTestStatus | DRAFT, SCHEDULED, LIVE, COMPLETED, CANCELLED | Paper lifecycle |
| TestAttemptStatus | ASSIGNED, IN_PROGRESS, SUBMITTED, AUTO_SUBMITTED, EXPIRED, ABSENT | Student attempt |
| SimilarityVerdict | LOW, MODERATE, REVIEW_RECOMMENDED | Faculty review |
| NotificationKind | TEST_SCHEDULED, TEST_STARTING, RESULT_PUBLISHED, AI_RECOMMENDATION, ACHIEVEMENT_UNLOCKED, STREAK_REMINDER, SYSTEM | Inbox |
| AchievementCategory | MILESTONE, STREAK, DIFFICULTY, TOPIC, INTERVIEW, UNIVERSITY | Badges |

### 7.2 Identity and preferences

**UserAccount.** Email unique; optional `clerkUserId`; optional scrypt hash; `isActive`; `lastLoginAt`. Cascades to sessions and profile.

**AuthSession.** `tokenHash` unique; `expiresAt`; optional `userAgent`. Indexed by account and expiry.

**UserProfile.** Academic fields; `languages` JSON; `dsaLevel`; `careerGoals` JSON; `role`; onboarding flags; `lastActiveAt`. Relations span the entire product (submissions, university, AI, achievements, notifications).

**UserPreferences.** Theme (`dark` default), editor theme `forge-dark`, font size 14, default language CPP, tab size 4, line numbers, autosave, email/push/streak toggles, `aiHintsEnabled`, `dailyGoalMinutes` 45.

### 7.3 Catalogue

**Topic.** Slug unique, category, `orderIndex`. Twenty-one seeded topics in six pedagogical buckets (Foundations, Linear Structures, Paradigms, Hierarchical, Networks, Advanced).

**Question.** Number unique (1… for published order), slug unique, full I/O statement, examples JSON, starter/solutions JSON, three progressive hints, editorial fields (`editorial`, `approach`, `intuition`, `algorithmSteps`), complexities, limits (default 2000 ms, 256 MB), `source`, `isPublished`, attempt/accept counters. Problem **pages deliberately omit solutions, editorials, and test cases** from the Prisma `select` used for the student view.

**QuestionTopic.** Many-to-many with `isPrimary`.

**TestCase.** Kind, order, input, expected output, points, optional explanation.

**UserTopicInterest.** Onboarding interests.

### 7.4 Practice execution

**Submission.** Code, language, status, pass counts, score, runtime/memory, compile log, **sample-only** `testResults` JSON, optional AI analysis/explanation, `answerRevealed`, `hintsUsed`, `timeSpentSec`.

**CodeExecution.** Job record; optional links to practice or university question/submission; mode; masked results JSON; worker id; attempt counter; timestamps.

**QuestionAttempt.** Unique `(userId, questionId)` rollup: outcome, counts, best runtime/memory, last code/language, reveal flag. Lets the problem list avoid aggregating the whole submissions table.

### 7.5 Companies and interview prep

**Company.** Slug, category, visual fields, hiring notes, `difficultyBias`, `topicWeights` via **CompanyTopicWeight**, ordered, `isActive`.

**CompanyQuestion.** Confidence, frequency, optional round/notes.

**UserCompanyPrep.** Readiness 0–100, solved/target counts, strong/weak JSON, `lastAnalyzedAt`, `isPinned`.

### 7.6 AI persistence

**AIQuestion.** Prompt, topic, difficulty, model/provider, raw payload JSON, validation report JSON, status, failure reason, optional `publishedQuestionId`.

**AIRecommendation.** Kind, copy, rationale, optional question/company/topic/difficulty, priority, path step index, dismissed/completed/expires.

**AIHint.** Unique `(userId, questionId, level)` so the ladder is stable.

### 7.7 Progress and gamification

**LearningProgress.** Solved/attempted/submission counters by difficulty; streaks; coding seconds; hints/reveals; XP and level; activity heatmap JSON (`{ date, solved, minutes }`, trimmed to ~370 days).

**TopicProgress.** Solved, attempted, accuracy, avg time, hints, `masteryScore`, strong/weak flags.

**Achievement** / **UserAchievement.** Criteria JSON `{ metric, threshold, scope? }`; progress vs target; `unlockedAt`; `seen`.

### 7.8 University (isolated question bank)

Faculty problems live in **UniversityQuestion** / **UniversityTestCase**, not the public `Question` table, so hidden exam IO cannot leak through practice endpoints. Import from catalogue is a copy (`import-question.ts`).

**University.** Join code for *institution* membership (distinct from per-test codes).

**UniversityMember**, **UniversityClass**, **UniversityClassMember.** Cohort structure.

**UniversityTest.** Schedule, duration, capacity, marks, passing marks, `joinCode` (`FORGE-` + 6 chars), `joinOpen`, instructions, allowed languages JSON, partial scoring, shuffle, `resultsPublished`.

**UniversityTestQuestion.** Order and per-question marks.

**UniversityTestStudent.** Assignment + **server** `startedAt` / `deadlineAt`; flags JSON for mark-for-review.

**UniversitySubmission.** Includes `marksAwarded`, `isFinal`, `autoSaved`; full `testResults` is faculty-only.

**UniversityResult.** Totals, rank, per-question breakdown JSON.

**CodeSimilarityReport.** Pairwise scores; `reviewed` + note.

**TestSchedule.** Optional queued lifecycle actions (`runAt`). Status transitions for open/close are also **derived on read** from the clock (`effectiveStatus`) so no cron is required to run the platform.

### 7.9 Notifications

**Notification.** Kind, title, body, href, icon, read flags, meta JSON. Indexed `(userId, read, createdAt)`.

---

## 8. The practice catalogue and integrity pipeline

### 8.1 Size and structure

The Arena is specified as **exactly 100 Easy, 100 Medium, 100 Hard** published problems. Source files (`easy-a/b/c`, `medium-a/b`, `hard-a/b`) may hold a surplus; `takeExactly` publishes the first 100 of each level and stores the rest as **unpublished spares**.

README verification target: **2120 test cases**, all generated by each problem’s JavaScript reference `solve(input)`, **21 topics**, every published problem with at least one public sample, at least three hidden/edge cases, three progressive hints, a worked example, editorial approach, and stated complexities.

### 8.2 Why expected outputs are not hand-copied

`prisma/seed-data/catalog.ts` `build(spec)` runs `spec.solve(input)` for samples, hidden, and edge inputs. A throw during seed is a catalogue bug. `npm run db:verify` rebuilds the catalogue without needing the database and asserts structure.

This is a **specification-as-code** technique: the statement and the oracle share one function, eliminating silent typos in golden outputs.

### 8.3 Topics (canonical list)

Foundations: Arrays, Strings, Linked Lists, Matrix.  
Linear: Stack, Queue.  
Paradigms: Recursion, Searching, Sorting, Hashing, Greedy, Backtracking, Dynamic Programming.  
Hierarchical: Trees, BST, Heap.  
Networks: Graphs.  
Advanced: Bit Manipulation, Math & Number Theory, Tries, Advanced Algorithms (segment trees, DSU, string algorithms, flow).

Curriculum order used by the **deterministic planner** (not identical to topic `orderIndex`): arrays → strings → searching → sorting → hashing → linked lists → stack → queue → recursion → trees → BST → heap → greedy → backtracking → graphs → DP → advanced, with per-step default difficulties Easy through Hard.

### 8.4 Multi-language reference solutions

Every problem has a complete written editorial. **Reference solutions in all four languages** exist for a subset (flagship problems). Reveal Answer states plainly when no code is stored for a language. Seed still attaches `GENERIC_STARTER` for C/C++/Java/Python so the editor always has a stub.

### 8.5 Development university fixture

Seed also creates **Forge Institute of Technology** (Pune, join code `FORGE-DEV1`) with faculty questions that exercise SAMPLE, HIDDEN, EDGE, and STRESS (e.g. Sum of an Array, Count Distinct Elements, Longest Word) and a scheduled assessment so the marking pipeline can be exercised locally.

---

## 9. Practice Arena: UX and judging semantics

### 9.1 List experience

Default difficulty tab is Easy. Filters: topic slug, attempt status (ALL / SOLVED / ATTEMPTED / NOT_ATTEMPTED), language via `languageTags`, search over title/description, page. Attempt map is loaded once and joined in memory to avoid N+1. Random problem button picks from the published set.

### 9.2 Workspace (`workspace.tsx`)

Client split view: problem panel (statement, examples, constraints) and Monaco. Actions: Run, Submit, progressive hints, Reveal Answer (confirm dialog), submission history, copy, font size, fullscreen, language select, restore starter. Drafts persist in **localStorage** per language. Timer/`timeSpentSec` is sent on submit but **cannot invent a verdict**; the server only uses it for progress accounting within a Zod max of 86400 seconds.

### 9.3 Run versus Submit

**POST `/api/practice/run`**

- Rate limit: 30 / minute (`run`).  
- Loads **only SAMPLE** cases.  
- Mode `RUN`.  
- Hidden IO cannot appear because it is never queried.

**POST `/api/practice/submit`**

- Rate limit: 20 / minute (`submit`).  
- Loads the full suite.  
- Judge **strips input, expected, and actual** of non-sample cases before the response leaves the server (`revealHidden` false).  
- `recordSubmission` updates attempt rollup, question counters, streak, heatmap, XP, topic mastery.  
- Achievements evaluated on accept.

### 9.4 Verdict taxonomy and output matching

Judge (`judge.ts`):

- Fatal sandbox errors → corresponding status.  
- Compile failure → `COMPILATION_ERROR`.  
- Per-case: TLE, MLE, output truncated, nonzero/null exit → RTE, else WA or AC.  
- Overall verdict is the **most severe** status in a fixed severity order (CE and internal errors outrank MLE/OLE/TLE/RTE/WA/AC).

**Output comparison.** Normalise CRLF, strip trailing whitespace per line, trim trailing newlines. Token-wise compare; numeric tokens allow relative tolerance `1e-6 * scale`; case-insensitive token equality allowed. This avoids failing students on whitespace and benign float formatting.

### 9.5 Hints and reveal

Hints: levels 1–3. AI if configured and `aiHintsEnabled`; else curated ladder. Unique DB row per level. Rate: 20 hints / 5 minutes.

Reveal: records `answerRevealed` on the attempt and increments progress counters. Editorial always; code per language when stored.

Analyze: `POST /api/practice/analyze` with `kind` analysis | explanation, 15 / 10 minutes, requires AI.

### 9.6 Default limits

Question defaults: 2000 ms, 256 MB. Server env can cap further: `EXECUTION_TIMEOUT_MS` (default 5000), `EXECUTION_MEMORY_MB` (256), `EXECUTION_OUTPUT_LIMIT_BYTES` (64 KiB). Code body max **100 KB** (`codeSchema`).

XP: first solve Easy 20 / Medium 45 / Hard 90; subsequent accept 5; other submissions 1. Level = floor(XP / 500) + 1.

---

## 10. Language toolchains and sandbox

### 10.1 Language specifications (argv only, never a shell string)

| Language | File | Compile | Run | Docker image (spec) | Overhead |
| --- | --- | --- | --- | --- | --- |
| C | `main.c` | `gcc -O2 -std=c11 -static-libgcc -o program main.c -lm` | `./program` | `dsaforge/runner-c:latest` | 0 |
| C++ | `main.cpp` | `g++ -O2 -std=c++17 -o program main.cpp` | `./program` | `dsaforge/runner-cpp:latest` | 0 |
| Java | `Main.java` | `javac -encoding UTF-8 Main.java` | `java -Xss64m -XX:+UseSerialGC Main` | `dsaforge/runner-java:latest` | 600 ms |
| Python | `main.py` | — | `python3 -E -S main.py` | `dsaforge/runner-python:latest` | 200 ms |

Python `-E -S` ignores user site and environment variables that would alter `sys.path`. Local driver maps `python3` → `python` on Windows and uses **absolute paths** for compiled binaries because Windows resolves relative executables against the parent process directory.

Worker README also documents pulling public images `gcc:13`, `eclipse-temurin:21-jdk`, `python:3.12-slim` for first-run speed.

### 10.2 Local driver (development)

Stripped environment, hard timeout, stdout cap, POSIX rlimits (CPU, address space, processes). **Not a security boundary.** Missing compilers yield a clear “toolchain not installed” verdict. Memory reporting exact under containers; local reports memory only if `/usr/bin/time` exists.

### 10.3 Remote worker isolation

Each job: `--network none`, `--read-only` + `--tmpfs /tmp`, `--cap-drop ALL`, `no-new-privileges`, `--pids-limit 64`, memory without swap, `--cpus 1`, user `65534:65534`, wall-clock `KILL`, output truncation. Endpoints: `GET /health`, `GET /languages`, `POST /execute`, all bearer-token gated when token is set.

Compose warning: mounting the Docker socket grants daemon control; never expose port 8080 publicly.

### 10.4 Horizontal scaling note

In-process queue is **per Next.js instance**. Fan-out belongs on the worker host. README production notes: `EXECUTION_DRIVER=remote`, `EXECUTION_SERVICE_URL`, `EXECUTION_SERVICE_TOKEN`.

Vercel deployments without a worker: Run/Submit return **503 EXECUTION_UNAVAILABLE**; browsing, reveal, and university *codes* still work. Health reports `execution.available: false` with reason.

---

## 11. Adaptive learning and company readiness

### 11.1 Learner snapshot (single input to all personalised surfaces)

Built from profile, `LearningProgress`, all `TopicProgress`, last eight non-accepted submissions, and mean of university result percentages:

- Level and career goals  
- Totals: solved, attempted, submissions, accepted, accuracy, difficulty splits, streak, hints, reveals, average seconds per solved problem  
- Per-topic mastery  
- Recent failures (title, topic, difficulty, status)  
- University average or null  
- Up to eight untouched topic slugs  

### 11.2 Deterministic planner (AI off or AI error)

Mastery ≥ 65% = strong; attempted ≥ 3 and mastery < 35% = weak.  
Recommended difficulty: Easy if solved < 15; else Medium if mediumSolved < 30 or accuracy < 55; else Hard.  
Next curriculum steps with mastery < 65, up to eight. Recommendations include a revision nudge for the weakest topic. Learning path goals are of the form “Solve 5 {difficulty} {topic} problems”.

`refreshRecommendations` maps recs onto the **lowest-number unpublished unsolved** question in that topic/difficulty, stores `TOPIC_FOCUS` and `LEARNING_PATH_STEP` rows, deleting incomplete prior recs.

### 11.3 Company readiness formula

Let coverage = 100 × (solved company-linked problems / linked total).  
Let weightedMastery = Σ (mastery(topic) × weight) / Σ weight using `CompanyTopicWeight`.  
**readiness = round(0.55 × coverage + 0.45 × weightedMastery)**, capped at 100.

Recommended next problems: unsolved links, sorted by lowest topic mastery then higher `frequency`. Strong topics: mastery ≥ 65; weak: < 40. Target count default 40 on `UserCompanyPrep`.

Optional AI `analyzeCompanyPrep` adds narrative; the numeric score is the same computation with or without AI.

### 11.4 Seeded companies (15 tracks)

Product examples: Google (HARD bias; graphs/DP heavy), Amazon, Microsoft, Meta, Apple, Adobe.  
Service / consulting: Infosys, TCS, Wipro, Accenture, Deloitte (generally EASY bias, arrays/strings/math).  
Aggregate tracks: Startups, Product-Based Companies, Service-Based Companies, Competitive Programming (HARD; DP/graphs/advanced/math).

All seeded `CompanyQuestion` links are **COMPANY_STYLE**.

---

## 12. Artificial intelligence layer

### 12.1 Abstraction

`AIProvider.complete({ system, messages, maxTokens, temperature, json })`. Keys stay in `provider.ts`. 60-second abort. JSON mode appends a “single JSON object, no fences” nudge and `parseJsonResponse` strips markdown if the model disobeys.

`isAIConfigured()` is a boolean; features degrade rather than crash.

### 12.2 Feature matrix (product behaviour)

| Feature | With `AI_API_KEY` | Without |
| --- | --- | --- |
| Hints | Generated, escalating | Curated ladder |
| Recommendations | AI-written plan | Deterministic engine on same snapshot |
| Learning path | AI-sequenced | Curriculum × mastery |
| Readiness score | Same formula + optional narrative | Formula only |
| Problem generation | Enabled | Disabled with UI reason |
| Code analysis / explanation | Enabled | Disabled with UI reason |

### 12.3 Prompts (roles)

`HINT_LADDER_SYSTEM`, `RECOMMENDATION_SYSTEM`, `COMPANY_PREP_SYSTEM`, `GENERATE_QUESTION_SYSTEM`, `VARIATION_SYSTEM`, `CODE_ANALYSIS_SYSTEM`, `EXPLAIN_SYSTEM` in `src/lib/ai/prompts.ts`. Hints are specified to **guide rather than dump the solution**.

### 12.4 Generation validation gates

Zod payload: title, description (≥40 chars), difficulty, topic, I/O, constraints, ≥1 example, ≥1 hint, approach, complexities, solutions record for C/CPP/JAVA/PYTHON, ≥4 test cases with kinds.

Consistency: require Python or C++ reference; promote first two cases to SAMPLE if none marked; coerce topic to request.

Test-case and difficulty heuristics follow. **Solution gate:** `runEphemeral` with limits; rewrite expected outputs from actual stdout when the reference is accepted; count corrections. Failures → `VALIDATION_FAILED` with report. Success → draft / pending review. Admin `POST /api/admin/ai-questions` publishes or rejects.

Rate: 8 generations / 10 minutes.

### 12.5 Admin review UI

`AIDraftReview` on `/admin` lists `PENDING_REVIEW` and `VALIDATION_FAILED` with validation reports.

---

## 13. University Assessment portal

### 13.1 Two join codes

| Code | Model field | Meaning |
| --- | --- | --- |
| Institution | `University.joinCode` | Membership of the college (seed example `FORGE-DEV1`) |
| Test | `UniversityTest.joinCode` | Enrolment in one paper; format `FORGE-` + 6 chars from alphabet `ACDEFGHJKMNPQRTUVWXY34679` (no O/0, I/1/L, S/5, B/8, Z/2) |

`joinOpen` can close enrolment without deleting the test. Allocation retries on unique-index collision.

### 13.2 Hosting without being pre-provisioned faculty

`POST /api/university/tests/quick` — any signed-in user. `ensureHostContext` attaches a workspace. Body may mix `catalogQuestionIds` and `customQuestions`. This is the self-service lab/hackathon path. Institutional faculty still use the full question bank and `make:faculty`.

Capacity presets in UI: 23 / 30 / 40 / 50, or any number. Partial scoring default true. Shuffle optional.

### 13.3 Server-authoritative time

`computeWindow`: deadline = min(startedAt + duration, test.endTime). Browser clock is never trusted. Every autosave, run, submit, and final submit re-checks. Expired attempts are closed server-side (`EXPIRED` / `AUTO_SUBMITTED`) even if the tab stays open.

`effectiveStatus`: DRAFT/CANCELLED unchanged; else SCHEDULED / LIVE / COMPLETED from `startTime`/`endTime`. `syncTestStatus` writes back when derived status differs.

### 13.4 Student attempt UX

`assessment-runner.tsx`: question list, mark-for-review flags, autosave, language constraints, sample run vs full university execute (`POST .../execute`), final submit (`POST .../final`). GET/POST/PATCH on `.../attempt` for load, start, and save.

Students cannot: enter unassigned tests, read another student’s result (unless faculty), see hidden cases, submit after expiry.

### 13.5 Evaluation

`evaluateStudent` scores from **final** submissions only. Marks computed server-side from passed tests and question max marks (partial scoring uses pass ratios / points). Writes `UniversityResult` with breakdown, percentage, pass vs `passingMarks`, time taken. Rank assigned when publishing. Notifications `RESULT_PUBLISHED`. Achievements (e.g. University Performer at 3 completed assessments) re-evaluated.

Export: `GET /api/university/tests/[id]/export` for faculty.

### 13.6 Similarity analysis (review indicator)

Method (`similarity.ts`):

1. Strip comments (language-aware) and string literals.  
2. Tokenise; numbers → `#NUM`; non-keyword identifiers → `#ID`.  
3. Token 4-gram **Jaccard**.  
4. Normalised **LCS** on token streams, capped at 900 tokens.  
5. Combined similarity = 0.55 × token + 0.45 × structural.  
6. Verdict: ≥ 0.85 `REVIEW_RECOMMENDED`, ≥ 0.65 `MODERATE`, else `LOW`. Stored as percentage with one decimal (`round` × 1000 / 10).  

Pairs skipped if languages differ, either code < 40 chars, or combined similarity < 45. Comments in code and README stress: **two honest solutions to a textbook problem will score high**; UI must not accuse.

---

## 14. Progress, streaks, achievements, notifications

### 14.1 Streaks

On accepted solve: if last solve today, keep streak; if yesterday, increment; if gap > 1 day, reset to 1. `effectiveStreak` on dashboard/progress pages accounts for calendar display without trusting the client.

### 14.2 Topic mastery

Updated in `updateTopicProgress` after each recorded submission (accuracy, average time, mastery score, strong/weak flags). Adaptive engine treats 65 / 35 as planning thresholds.

### 14.3 Achievement catalogue (seeded)

Milestones: 1, 10, 50, 100, 250, 300 solves (bronze → platinum, XP 25 to 1200).  
Streaks: 7-day, 30-day.  
Difficulty masters: all 100 Easy / Medium / Hard.  
Topic specialists: 20 arrays, 12 trees, 15 graphs, 15 DP.  
Interview Explorer: 3 companies started.  
University Performer: 3 assessments completed.

Evaluation after accepted practice submits and after university results. Partial progress stored for bars. Unlock emits `ACHIEVEMENT_UNLOCKED` notification.

### 14.4 Notifications API

`GET /api/notifications` — list.  
`PATCH` — mark read.  
Menu in app shell shows unread count from layout.

---

## 15. Validation, errors, and rate limits

### 15.1 Zod trust boundary

`src/lib/validation/schemas.ts` parses every inbound payload. Documented invariant: **no schema accepts a user id, a role, or a score.** Practice schemas take `questionId`, language, code, optional `timeSpentSec`. University schemas take test/question identifiers the server then authorises via membership tables.

### 15.2 Unified API errors (`api.ts`)

| Exception | HTTP | Code |
| --- | --- | --- |
| ZodError | 422 | VALIDATION_ERROR |
| UnauthorizedError | 401 | UNAUTHORIZED |
| ForbiddenError | 403 | FORBIDDEN |
| RateLimitError | 429 | RATE_LIMITED (+ Retry-After) |
| QueueOverflowError | 429 | QUEUE_FULL |
| ExecutionUnavailableError | 503 | EXECUTION_UNAVAILABLE |
| AIUnavailableError | 503 | AI_UNAVAILABLE |
| AIRequestError | 502 | AI_ERROR |
| MissingEnvError | 503 | CONFIG_ERROR |
| Prisma/connect heuristics | 503 | DATABASE_ERROR |
| Else | 500 | INTERNAL_ERROR |

`handler()` wraps route functions. `AppError` carries explicit status/code.

### 15.3 Rate limits (in-memory sliding window)

| Key | Limit | Window | Typical routes |
| --- | --- | --- | --- |
| run | 30 | 60 s | practice run, university execute |
| submit | 20 | 60 s | practice submit |
| aiHint | 20 | 5 min | hints |
| aiGenerate | 8 | 10 min | generate |
| aiAnalyze | 15 | 10 min | analyze |
| search | 60 | 60 s | global search |
| write | 60 | 60 s | university writes, quick test, etc. |

Store is a `Map` with opportunistic cleanup above 5000 keys. **Multi-instance production should replace this with Redis/Upstash** (commented in source). Identifier is the profile id, not IP alone.

### 15.4 Search scoping

`GET /api/search?q=` searches published questions, topics, companies, and tests the caller is assigned to or owns. People are searchable only by faculty **within their university**.

---

## 16. HTTP API catalogue

Public:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Readiness: database kind/reachable, auth/session secret boolean, AI configured, execution driver/queue — **no secrets leaked** |

Authenticated practice / AI / profile:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/practice/run` | Sample-only execution |
| POST | `/api/practice/submit` | Full-suite judge + progress |
| POST / GET | `/api/practice/hint` | Create/fetch hint level |
| POST | `/api/practice/reveal` | Editorial / solutions |
| POST | `/api/practice/analyze` | AI analysis or explanation |
| GET | `/api/practice/submissions` | History |
| POST | `/api/ai/recommendations` | Refresh plan |
| POST | `/api/ai/generate` | Generate + validate problem |
| POST | `/api/admin/ai-questions` | Publish/reject drafts |
| POST / PUT | `/api/interview-prep` | Analyse / pin company prep |
| PATCH / PUT | `/api/profile` | Profile and preferences |
| GET | `/api/search` | Global search |
| GET / PATCH | `/api/notifications` | Inbox |

University:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/university/join` | Join institution by code |
| POST | `/api/university/questions` | Create question |
| PUT / PATCH | `/api/university/questions` | Replace / patch |
| POST | `/api/university/tests` | Create test |
| POST | `/api/university/tests/quick` | One-shot host + join code |
| POST | `/api/university/tests/join` | Join test by code |
| PATCH / DELETE | `/api/university/tests/[id]` | Update / cancel |
| GET / POST / PATCH | `/api/university/tests/[id]/attempt` | Load / start / autosave |
| POST | `/api/university/tests/[id]/execute` | Run code in attempt |
| POST | `/api/university/tests/[id]/final` | Final submit + evaluate |
| POST / DELETE | `/api/university/tests/[id]/students` | Assign / unassign |
| GET | `/api/university/tests/[id]/export` | Results export |

Sandbox worker (separate host): GET `/health`, GET `/languages`, POST `/execute`.

---

## 17. User interface, design system, and accessibility

### 17.1 Visual language

CSS comments describe a **deep navy ground, electric blue for action, purple for AI, green for success, orange for highlights**. Tokens are HSL components (`--forge-bg`, `--forge-primary`, `--forge-ai`, `--forge-success`, …) exposed to Tailwind as `bg-bg`, `text-forge`, `text-ai`, `border-border-subtle`, etc. Radius ~0.75rem. Dark default; light is a designed palette, not a naive invert.

Difficulty colours: Easy emerald, Medium amber, Hard rose.

### 17.2 Component inventory (product, not generic UI)

**Layout.** App shell, sidebar, page header/shell, global search, notifications, marketing nav, logo/wordmark.  
**Practice.** Problem table, filters, difficulty tabs, random button, problem panel, results panel, hints, reveal, success, submission history, workspace.  
**Interview.** Company grid, company advisor, generate-problem panel, refresh-plan button.  
**University.** Portal hub (hosted/joined), join university, join test, question bank/editor, test builder, host/create forms, test code panel, start-test panel, assessment runner, results table, similarity panel, status badge.  
**Editor.** Monaco wrapper + worker.  
**Charts.** Activity line, difficulty donut, heatmap, topic mastery.  
**Settings / profile / admin / auth.** Dedicated forms; Clerk appearance helper.  
**Marketing.** Hero terminal (animated flavour of the product).

### 17.3 Accessibility and UX details

Skip-to-content link in root layout. `sr-only` / focus styles. Sidebar tooltips when collapsed. `aria-current="page"` on nav. Confirm dialogs for destructive/reveal actions. Toaster bottom-right. 404 copy avoids blaming the user and offers recovery links.

Authenticated pages set Metadata titles (`Practice Arena`, `AI Interview Prep`, …) with template `%s | DSA Forge`. Open Graph uses tagline and description. Viewport theme-color tracks dark/light.

### 17.4 Client/server split

Data-heavy pages are Server Components querying Prisma directly (dashboard, practice list, interview grid, university hub, progress, admin). Interactive judging UI is client-side and talks to route handlers. This matches Next.js App Router norms and keeps secrets off the bundle (`env.ts` hard-fails on client import).

---

## 18. Operational tooling and scripts

| npm script | Purpose |
| --- | --- |
| `dev` / `build` / `start` | Next; build runs `prisma generate` first |
| `lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `db:migrate` / `db:deploy` / `db:push` / `db:studio` | Schema |
| `db:seed` | Idempotent upserts |
| `db:verify` | Catalogue integrity (no DB) |
| `db:verify:solutions` / `reveal` / `testcode` / `attempt` | Additional oracles |
| `audit:routes` | Smoke-walk pages/APIs as a synthetic signed-in admin |
| `make:faculty` | Out-of-band faculty (+ optional admin) |
| `sandbox` | Worker |
| `setup` | generate + migrate + seed |

Seed is **idempotent** (upsert on natural keys; topics/test cases replaced wholesale per question).

`audit-routes.ts` creates a throwaway user, signs a session, and checks expected status families — a deployment smoke test, not a correctness proof.

Health probe distinguishes `database.kind`: `unset` | `file` | `remote` without printing the URL (credentials live in Neon URLs).

---

## 19. Deployment architecture

### 19.1 Recommended production shape

1. Next.js on Vercel (or similar serverless) with **pooled** `DATABASE_URL`.  
2. `SESSION_SECRET` required in production (dev derives SHA-256 of `dsa-forge-dev:${cwd}`).  
3. Clerk keys for hosted auth; optional `ADMIN_EMAILS`.  
4. Docker worker on Railway / Fly / Render / VPS; app uses remote driver.  
5. `NEXT_PUBLIC_APP_URL` for absolute links.  
6. Optional `AI_API_KEY` / `AI_PROVIDER` / `AI_MODEL` / `AI_BASE_URL` / `AI_MAX_TOKENS`.

Migrations: **`npm run db:deploy`**, not `db push`, in production. Seed from a trusted machine, not from Vercel build.

### 19.2 Prisma 7 specifics

The app uses the new `prisma-client` generator and **must** pass a driver adapter (`PrismaPg`). Client is a lazy `Proxy` so `next build` does not open a connection. File URLs are rejected with an actionable error (legacy SQLite default).

JSON list columns remain because changing them would churn seed, helpers, and queries for little gain.

### 19.3 Known operational limitations

- In-memory rate limiter and work queue do not share state across replicas.  
- Scheduled test open/close needs no cron because status is derived on read; `TestSchedule` exists for reminders but is not required for correctness.  
- Local driver needs gcc/g++/javac/python on PATH.  
- Socket-mounted compose worker is powerful and dangerous if exposed.

---

## 20. Security analysis (as designed)

### 20.1 Strengths evidenced in code

1. Server-side identity; no client user ids.  
2. Zod at every mutation boundary; scores not inbound.  
3. Hidden cases excluded from Run queries and stripped from Submit responses.  
4. University questions isolated from public catalogue tables.  
5. Production code execution isolated; worker has no app secrets.  
6. Argv-only compilers (no `sh -c` interpolation of user code).  
7. Session tokens hashed at rest; passwords scrypt.  
8. Admin and faculty are not client-asserted.  
9. Exam timer from server timestamps.  
10. Similarity framed as review, reducing false-accusation UX risk.  
11. Health endpoint boolean-only.  
12. Rate limits on expensive endpoints.  
13. Code size cap 100 KB.  
14. Queue overflow returns 429 instead of melting the node.

### 20.2 Residual risks (honest)

- Local execution driver is explicitly unsafe for production (shared kernel).  
- Rate limit store is process-local; a fleet can be over-invoked unless Redis is added.  
- Docker socket in example compose is a host-compromise path if the worker is public.  
- LLM generation can still produce pedagogically weak items that *pass* the executable gate.  
- Similarity is syntactic; it will not catch semantic cheats or collusion via shared ideas, and it *will* flag independent identical textbook code.  
- Clerk misconfiguration fails closed to “signed out” rather than open, which is correct, but operators must watch `/api/health`.  
- `ADMIN_EMAILS` is a powerful bootstrap; compromise of email + sign-up is compromise of admin if the list is wrong.

This section is an architecture review of *this* codebase, not a penetration-test report.

---

## 21. Pedagogical design

DSA Forge encodes a **curriculum-shaped** Easy→Hard topic sequence, **progressive hints** (three rungs) instead of immediate solutions, **Reveal Answer** as an explicit, counted act (so analytics can see over-reliance), **company-style** practice without fake “asked at Google” claims, and **university papers** with SAMPLE/HIDDEN/EDGE/STRESS so marking can reward partial correctness.

XP and achievements are secondary reinforcers; the primary feedback loop is the judge. Adaptive recommendations prefer filling mastery gaps before inflating difficulty (accuracy and medium-solve gates).

Onboarding captures college context (Indian degree/branch vocabulary is first-class), which aligns the product with campus placement more than with generic Western bootcamps—without excluding other users (`Graduated`, `Other` branch).

---

## 22. Complete file-map of the application (src)

**App Router.** Marketing page/layout; auth layout + Clerk catch-alls + `actions.ts`; onboarding page/wizard/actions; app layout, loading, error; dashboard; practice list + `[slug]`; interview-prep list + `[slug]`; university hub, questions CRUD, tests create/detail/attempt/result/results; progress; achievements; profile; settings + actions; admin; `not-found`; `globals.css`; root `layout.tsx`; `proxy.ts` at `src/proxy.ts`.

**API.** Listed in §16.

**lib.** `db`, `env`, `api`, `constants`, `utils`, `json-fields`, `clipboard`, `notifications`, `rate-limit`; `auth/*` (session, sessions, cookie, password, clerk-account, clerk-appearance, permissions); `execution/*` (index, types, judge, queue, errors, languages, drivers local/remote); `ai/*` (provider, service, prompts, validation); `analytics/*` (progress, achievements, adaptive, similarity); `university/*` (evaluation, workspace, test-code, import-question); `validation/schemas.ts`.

**components.** Grouped in §17.2.  
**types.** Shared DTOs (`QuestionExample`, `TestCaseResult`, `ExecutionOutcome`, validation report types, etc.).  
**generated/prisma.** Prisma Client output (generated, not hand-edited).

**prisma.** `schema.prisma`, `seed.ts`, `seed-data/**`, `verify-*.ts`, `make-faculty.ts`, `audit-routes.ts`, `client` helper, migrations.

**sandbox.** `server.js`, README.

---

## 23. Limitations and future work (from the product itself)

Documented limitations:

1. Four-language *code* oracles are incomplete; editorials are complete.  
2. Local toolchain dependency for developers.  
3. Memory metrics weaker on the local driver.  
4. No background job required—and therefore no guaranteed push at exact `startTime` unless `TestSchedule` is later wired to a worker.  
5. Serverless hosting cannot compile student code without an external sandbox.  
6. In-process queue/rate limits vs multi-instance.

Reasonable extensions implied by the architecture (not implemented as requirements here): Redis rate limits, a true job runner for notifications, richer plagiarism (AST/PDG), contest mode, more languages, verified-historical company imports, per-language reference solutions for the full 300.

---

## 24. Conclusion

DSA Forge is a **three-portal, single-profile** system that treats an online judge, an interview coach, and a university lab as one product. Its distinguishing engineering choices are (1) a 300-problem catalogue whose oracles generate their own expected outputs; (2) a production sandbox that never shares secrets with student code; (3) a trust model in which the browser cannot award marks, stop the clock, or inspect hidden tests; (4) an AI layer that is optional, provider-swappable, and forbidden from publishing problems until a reference solution actually runs; and (5) company labelling that refuses unverified “this was asked at X” claims.

The website’s information architecture matches that thesis: a marketing explanation of the three portals, a five-step academic onboarding, a persistent sidebar in which Practice, Interview, and University stay equally reachable, and supporting surfaces (dashboard, progress, achievements, admin) that read the same server-side ledgers the judge writes.

This paper is a complete as-built description of that website and codebase for readers who need architectural, pedagogical, and operational understanding in one place.

---

## Appendix A. Environment variables (server)

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (pooled Neon recommended) |
| `SESSION_SECRET` | Cookie HMAC; required in production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Hosted auth |
| `NEXT_PUBLIC_APP_URL` | Canonical origin |
| `ADMIN_EMAILS` | Bootstrap admins |
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` / `AI_MAX_TOKENS` | LLM |
| `EXECUTION_DRIVER` | `local` \| `remote` |
| `EXECUTION_SERVICE_URL` / `EXECUTION_SERVICE_TOKEN` | Worker |
| `EXECUTION_TIMEOUT_MS` / `EXECUTION_MEMORY_MB` / `EXECUTION_OUTPUT_LIMIT_BYTES` / `EXECUTION_WORKDIR` | Caps |
| `EXECUTION_CONCURRENCY` / `EXECUTION_MAX_PENDING` | Queue |
| Worker `PORT` / `EXECUTION_SERVICE_TOKEN` | Sandbox process |

`env.ts` treats placeholder strings (`USER:PASSWORD`, `xxxx`, angle-bracket templates) as **not configured**.

---

## Appendix B. Prisma models (37)

UserAccount, AuthSession, UserProfile, UserPreferences, Topic, UserTopicInterest, Question, QuestionTopic, TestCase, Submission, CodeExecution, QuestionAttempt, Company, CompanyQuestion, CompanyTopicWeight, UserCompanyPrep, AIQuestion, AIRecommendation, AIHint, LearningProgress, TopicProgress, Achievement, UserAchievement, University, UniversityMember, UniversityClass, UniversityClassMember, UniversityQuestion, UniversityTestCase, UniversityTest, UniversityTestQuestion, UniversityTestStudent, UniversitySubmission, UniversityResult, CodeSimilarityReport, TestSchedule, Notification.

---

## Appendix C. Keyword indexing for search engines / internal docs

DSA, data structures and algorithms, online judge, Monaco editor, C, C++, Java, Python, Neon, Prisma 7, Next.js 16, Clerk, university assessment, similarity review, adaptive learning, company interview preparation, sandboxed execution, hidden test cases, readiness score, Practice Arena, DSA Forge.

---

*End of paper. Source of truth remains the repository; this document describes the tree as studied on 26 September 2026.*
