/**
 * Companies, achievements and the development university fixture.
 *
 * Company associations are labelled with a provenance level. Nothing here
 * claims a problem was actually asked in a real interview: everything seeded is
 * COMPANY_STYLE, meaning "matches the patterns this company is known to screen
 * on". The VERIFIED_HISTORICAL level exists in the schema for institutions that
 * import genuinely sourced data.
 */

export interface SeedCompany {
  slug: string;
  name: string;
  category: "PRODUCT" | "SERVICE" | "STARTUP" | "FINTECH" | "CONSULTING" | "CORE" | "OTHER";
  logoEmoji: string;
  brandColor: string;
  description: string;
  hiringNotes: string;
  difficultyBias: "EASY" | "MEDIUM" | "HARD";
  orderIndex: number;
  /** Topic slug -> weight, used by the readiness calculation. */
  topicWeights: Record<string, number>;
}

export const COMPANIES: SeedCompany[] = [
  {
    slug: "google",
    name: "Google",
    category: "PRODUCT",
    logoEmoji: "🔍",
    brandColor: "#4285F4",
    description: "Algorithmic depth, clean reasoning and complexity discussion under time pressure.",
    hiringNotes:
      "Rounds typically favour graphs, dynamic programming and problems with a subtle optimisation. Expect to justify your complexity out loud.",
    difficultyBias: "HARD",
    orderIndex: 1,
    topicWeights: { graphs: 90, dp: 90, arrays: 70, strings: 70, trees: 65, advanced: 60 },
  },
  {
    slug: "amazon",
    name: "Amazon",
    category: "PRODUCT",
    logoEmoji: "📦",
    brandColor: "#FF9900",
    description: "Breadth across data structures with heavy emphasis on practical problem solving.",
    hiringNotes:
      "Expect arrays, hashing, trees, graphs and heap problems at Medium difficulty, plus behavioural rounds on leadership principles.",
    difficultyBias: "MEDIUM",
    orderIndex: 2,
    topicWeights: { arrays: 90, hashing: 85, trees: 80, graphs: 75, heap: 70, dp: 65 },
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    category: "PRODUCT",
    logoEmoji: "🪟",
    brandColor: "#00A4EF",
    description: "Solid fundamentals, pointer manipulation and clear, correct code.",
    hiringNotes:
      "Linked lists, trees, strings and matrix problems appear often. Correctness and edge-case handling are weighted heavily.",
    difficultyBias: "MEDIUM",
    orderIndex: 3,
    topicWeights: { "linked-lists": 85, trees: 85, strings: 80, arrays: 75, matrix: 70, dp: 60 },
  },
  {
    slug: "meta",
    name: "Meta",
    category: "PRODUCT",
    logoEmoji: "♾️",
    brandColor: "#0866FF",
    description: "Speed and fluency: two problems per round with little time to spare.",
    hiringNotes:
      "Arrays, strings, graphs and trees at pace. Communicating while you code matters as much as the final solution.",
    difficultyBias: "MEDIUM",
    orderIndex: 4,
    topicWeights: { arrays: 90, strings: 85, graphs: 80, trees: 75, hashing: 75, dp: 60 },
  },
  {
    slug: "apple",
    name: "Apple",
    category: "PRODUCT",
    logoEmoji: "🍎",
    brandColor: "#A2AAAD",
    description: "Fundamentals plus depth in the domain of the team you are interviewing with.",
    hiringNotes:
      "Expect arrays, strings and design-flavoured questions, often grounded in a concrete product scenario.",
    difficultyBias: "MEDIUM",
    orderIndex: 5,
    topicWeights: { arrays: 80, strings: 80, trees: 70, "linked-lists": 65, dp: 55 },
  },
  {
    slug: "adobe",
    name: "Adobe",
    category: "PRODUCT",
    logoEmoji: "🎨",
    brandColor: "#FF0000",
    description: "Classic data-structure rounds with a strong aptitude and fundamentals component.",
    hiringNotes:
      "Arrays, strings, stacks and dynamic programming at Easy to Medium difficulty, plus core CS fundamentals.",
    difficultyBias: "MEDIUM",
    orderIndex: 6,
    topicWeights: { arrays: 85, strings: 80, stack: 70, dp: 70, sorting: 65 },
  },
  {
    slug: "infosys",
    name: "Infosys",
    category: "SERVICE",
    logoEmoji: "🏢",
    brandColor: "#007CC3",
    description: "Aptitude, fundamentals and implementation-focused coding rounds.",
    hiringNotes:
      "Expect Easy to Medium problems on arrays, strings, recursion and basic mathematics, with an emphasis on clean implementation.",
    difficultyBias: "EASY",
    orderIndex: 10,
    topicWeights: { arrays: 85, strings: 85, math: 75, recursion: 65, sorting: 60 },
  },
  {
    slug: "tcs",
    name: "TCS",
    category: "SERVICE",
    logoEmoji: "🏛️",
    brandColor: "#004B87",
    description: "High-volume campus hiring with a structured, fundamentals-first assessment.",
    hiringNotes:
      "The coding section favours straightforward array, string and number problems solved correctly under time pressure.",
    difficultyBias: "EASY",
    orderIndex: 11,
    topicWeights: { arrays: 85, strings: 80, math: 80, searching: 60, sorting: 60 },
  },
  {
    slug: "wipro",
    name: "Wipro",
    category: "SERVICE",
    logoEmoji: "🌐",
    brandColor: "#341E60",
    description: "Fundamentals, aptitude and a practical coding round.",
    hiringNotes: "Arrays, strings, loops and basic problem solving, with correctness prioritised over optimality.",
    difficultyBias: "EASY",
    orderIndex: 12,
    topicWeights: { arrays: 80, strings: 80, math: 70, recursion: 55 },
  },
  {
    slug: "accenture",
    name: "Accenture",
    category: "CONSULTING",
    logoEmoji: "🧭",
    brandColor: "#A100FF",
    description: "Assessment-style rounds mixing aptitude with implementation problems.",
    hiringNotes: "Expect Easy problems on strings, arrays and simple simulation alongside cognitive assessments.",
    difficultyBias: "EASY",
    orderIndex: 13,
    topicWeights: { strings: 80, arrays: 75, math: 70, sorting: 55 },
  },
  {
    slug: "deloitte",
    name: "Deloitte",
    category: "CONSULTING",
    logoEmoji: "📊",
    brandColor: "#86BC25",
    description: "Technology consulting rounds combining fundamentals with case-style reasoning.",
    hiringNotes: "Coding is usually Easy to Medium on arrays and strings, paired with situational and aptitude sections.",
    difficultyBias: "EASY",
    orderIndex: 14,
    topicWeights: { arrays: 75, strings: 75, math: 65, hashing: 55 },
  },
  {
    slug: "startups",
    name: "Startups",
    category: "STARTUP",
    logoEmoji: "🚀",
    brandColor: "#F97316",
    description: "Practical, build-oriented problems close to real product work.",
    hiringNotes:
      "Expect hashing, strings and system-flavoured questions rather than heavy algorithm theory. Shipping ability is weighted highly.",
    difficultyBias: "MEDIUM",
    orderIndex: 20,
    topicWeights: { hashing: 85, strings: 80, arrays: 75, graphs: 55, dp: 45 },
  },
  {
    slug: "product-based",
    name: "Product-Based Companies",
    category: "PRODUCT",
    logoEmoji: "🧩",
    brandColor: "#3B82F6",
    description: "A general track for algorithm-heavy product company interviews.",
    hiringNotes:
      "A blended set covering the patterns product companies screen on most: arrays, hashing, trees, graphs and dynamic programming.",
    difficultyBias: "MEDIUM",
    orderIndex: 21,
    topicWeights: { arrays: 85, hashing: 80, trees: 75, graphs: 75, dp: 75 },
  },
  {
    slug: "service-based",
    name: "Service-Based Companies",
    category: "SERVICE",
    logoEmoji: "🛠️",
    brandColor: "#0EA5E9",
    description: "A general track for mass-recruiter coding assessments.",
    hiringNotes:
      "Fundamentals-first: arrays, strings, mathematics and recursion, with speed and accuracy mattering more than optimality.",
    difficultyBias: "EASY",
    orderIndex: 22,
    topicWeights: { arrays: 85, strings: 85, math: 75, recursion: 60, searching: 55 },
  },
  {
    slug: "competitive-programming",
    name: "Competitive Programming",
    category: "OTHER",
    logoEmoji: "⚡",
    brandColor: "#8B5CF6",
    description: "Contest-style problems where speed and advanced algorithms decide the outcome.",
    hiringNotes:
      "Heavier on graphs, dynamic programming, number theory and advanced data structures than any interview track.",
    difficultyBias: "HARD",
    orderIndex: 23,
    topicWeights: { dp: 95, graphs: 90, advanced: 90, math: 85, "bit-manipulation": 70 },
  },
];

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface SeedAchievement {
  slug: string;
  name: string;
  description: string;
  category: "MILESTONE" | "STREAK" | "DIFFICULTY" | "TOPIC" | "INTERVIEW" | "UNIVERSITY";
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  xpReward: number;
  criteria: { metric: string; threshold: number; topicSlug?: string };
  orderIndex: number;
}

export const ACHIEVEMENTS: SeedAchievement[] = [
  { slug: "first-problem", name: "First Problem", description: "Solve your very first problem.", category: "MILESTONE", icon: "Sparkles", tier: "bronze", xpReward: 25, criteria: { metric: "solved", threshold: 1 }, orderIndex: 1 },
  { slug: "ten-problems", name: "10 Problems", description: "Solve ten problems.", category: "MILESTONE", icon: "Target", tier: "bronze", xpReward: 50, criteria: { metric: "solved", threshold: 10 }, orderIndex: 2 },
  { slug: "fifty-problems", name: "50 Problems", description: "Solve fifty problems.", category: "MILESTONE", icon: "Flame", tier: "silver", xpReward: 150, criteria: { metric: "solved", threshold: 50 }, orderIndex: 3 },
  { slug: "hundred-problems", name: "100 Problems", description: "Solve one hundred problems.", category: "MILESTONE", icon: "Trophy", tier: "gold", xpReward: 300, criteria: { metric: "solved", threshold: 100 }, orderIndex: 4 },
  { slug: "two-fifty-problems", name: "250 Problems", description: "Solve two hundred and fifty problems.", category: "MILESTONE", icon: "Medal", tier: "gold", xpReward: 600, criteria: { metric: "solved", threshold: 250 }, orderIndex: 5 },
  { slug: "three-hundred-problems", name: "300 Problems", description: "Clear the entire Practice Arena.", category: "MILESTONE", icon: "Crown", tier: "platinum", xpReward: 1200, criteria: { metric: "solved", threshold: 300 }, orderIndex: 6 },

  { slug: "seven-day-streak", name: "7-Day Streak", description: "Solve at least one problem every day for a week.", category: "STREAK", icon: "Flame", tier: "silver", xpReward: 120, criteria: { metric: "streak", threshold: 7 }, orderIndex: 10 },
  { slug: "thirty-day-streak", name: "30-Day Streak", description: "Keep a solving streak alive for a full month.", category: "STREAK", icon: "CalendarCheck", tier: "gold", xpReward: 500, criteria: { metric: "streak", threshold: 30 }, orderIndex: 11 },

  { slug: "easy-master", name: "Easy Master", description: "Solve all one hundred Easy problems.", category: "DIFFICULTY", icon: "CircleCheck", tier: "silver", xpReward: 250, criteria: { metric: "easySolved", threshold: 100 }, orderIndex: 20 },
  { slug: "medium-master", name: "Medium Master", description: "Solve all one hundred Medium problems.", category: "DIFFICULTY", icon: "ShieldCheck", tier: "gold", xpReward: 500, criteria: { metric: "mediumSolved", threshold: 100 }, orderIndex: 21 },
  { slug: "hard-master", name: "Hard Master", description: "Solve all one hundred Hard problems.", category: "DIFFICULTY", icon: "Swords", tier: "platinum", xpReward: 1000, criteria: { metric: "hardSolved", threshold: 100 }, orderIndex: 22 },

  { slug: "graph-specialist", name: "Graph Specialist", description: "Solve fifteen graph problems.", category: "TOPIC", icon: "Share2", tier: "silver", xpReward: 200, criteria: { metric: "topicSolved", threshold: 15, topicSlug: "graphs" }, orderIndex: 30 },
  { slug: "dp-specialist", name: "DP Specialist", description: "Solve fifteen dynamic programming problems.", category: "TOPIC", icon: "Layers", tier: "silver", xpReward: 200, criteria: { metric: "topicSolved", threshold: 15, topicSlug: "dp" }, orderIndex: 31 },
  { slug: "tree-specialist", name: "Tree Specialist", description: "Solve twelve tree problems.", category: "TOPIC", icon: "GitBranch", tier: "silver", xpReward: 180, criteria: { metric: "topicSolved", threshold: 12, topicSlug: "trees" }, orderIndex: 32 },
  { slug: "array-specialist", name: "Array Specialist", description: "Solve twenty array problems.", category: "TOPIC", icon: "Grid3x3", tier: "bronze", xpReward: 120, criteria: { metric: "topicSolved", threshold: 20, topicSlug: "arrays" }, orderIndex: 33 },

  { slug: "interview-explorer", name: "Interview Explorer", description: "Start preparation for three companies.", category: "INTERVIEW", icon: "Bot", tier: "bronze", xpReward: 100, criteria: { metric: "companiesExplored", threshold: 3 }, orderIndex: 40 },
  { slug: "university-performer", name: "University Performer", description: "Complete three university assessments.", category: "UNIVERSITY", icon: "GraduationCap", tier: "silver", xpReward: 200, criteria: { metric: "universityTests", threshold: 3 }, orderIndex: 50 },
];

// ---------------------------------------------------------------------------
// Development university fixture
// ---------------------------------------------------------------------------

export const DEV_UNIVERSITY = {
  slug: "forge-institute-of-technology",
  name: "Forge Institute of Technology",
  shortName: "FIT",
  city: "Pune",
  joinCode: "FORGE-DEV1",
};

/**
 * Faculty-authored questions for the sample assessment. These deliberately
 * carry every class of test case so the marking pipeline is exercised end to
 * end in development.
 */
export const DEV_UNIVERSITY_QUESTIONS = [
  {
    title: "Sum of an Array",
    topic: "arrays",
    difficulty: "EASY" as const,
    description:
      "Read n integers and print their sum. The total may exceed the range of a 32-bit integer, so use a 64-bit accumulator.",
    inputFormat: "First line: n.\nSecond line: n integers.",
    outputFormat: "The sum of all n integers.",
    constraints: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    sampleInput: "5\n1 2 3 4 5",
    sampleOutput: "15",
    defaultMarks: 20,
    testCases: [
      { kind: "SAMPLE" as const, input: "5\n1 2 3 4 5", expectedOutput: "15", points: 1 },
      { kind: "SAMPLE" as const, input: "3\n-1 0 1", expectedOutput: "0", points: 1 },
      { kind: "HIDDEN" as const, input: "1\n42", expectedOutput: "42", points: 2 },
      { kind: "HIDDEN" as const, input: "4\n10 20 30 40", expectedOutput: "100", points: 2 },
      { kind: "EDGE" as const, input: "2\n1000000000 1000000000", expectedOutput: "2000000000", points: 3 },
      { kind: "EDGE" as const, input: "2\n-1000000000 -1000000000", expectedOutput: "-2000000000", points: 3 },
    ],
  },
  {
    title: "Count Distinct Elements",
    topic: "hashing",
    difficulty: "MEDIUM" as const,
    description:
      "Read n integers and print how many distinct values appear. A hash set answers this in one pass.",
    inputFormat: "First line: n.\nSecond line: n integers.",
    outputFormat: "The number of distinct values.",
    constraints: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    sampleInput: "6\n1 2 2 3 3 3",
    sampleOutput: "3",
    defaultMarks: 30,
    testCases: [
      { kind: "SAMPLE" as const, input: "6\n1 2 2 3 3 3", expectedOutput: "3", points: 1 },
      { kind: "SAMPLE" as const, input: "4\n5 5 5 5", expectedOutput: "1", points: 1 },
      { kind: "HIDDEN" as const, input: "1\n0", expectedOutput: "1", points: 2 },
      { kind: "HIDDEN" as const, input: "5\n1 2 3 4 5", expectedOutput: "5", points: 2 },
      { kind: "EDGE" as const, input: "2\n-1000000000 1000000000", expectedOutput: "2", points: 3 },
      { kind: "STRESS" as const, input: `1000\n${Array.from({ length: 1000 }, (_, i) => i % 250).join(" ")}`, expectedOutput: "250", points: 4 },
    ],
  },
  {
    title: "Longest Word",
    topic: "strings",
    difficulty: "MEDIUM" as const,
    description:
      "Read n words and print the longest one. If several words tie for the longest, print the one that appears first.",
    inputFormat: "First line: n.\nSecond line: n space-separated words.",
    outputFormat: "The longest word.",
    constraints: "1 <= n <= 10000\nEach word is at most 50 characters.",
    sampleInput: "4\nforge your dsa skills",
    sampleOutput: "skills",
    defaultMarks: 25,
    testCases: [
      { kind: "SAMPLE" as const, input: "4\nforge your dsa skills", expectedOutput: "skills", points: 1 },
      { kind: "SAMPLE" as const, input: "3\nabc de fgh", expectedOutput: "abc", points: 1 },
      { kind: "HIDDEN" as const, input: "1\nhello", expectedOutput: "hello", points: 2 },
      { kind: "HIDDEN" as const, input: "5\na bb ccc dd e", expectedOutput: "ccc", points: 2 },
      { kind: "EDGE" as const, input: "2\nx y", expectedOutput: "x", points: 3 },
    ],
  },
  {
    title: "Second Largest",
    topic: "arrays",
    difficulty: "MEDIUM" as const,
    description:
      "Read n integers and print the second largest distinct value. If every value is equal, print -1.",
    inputFormat: "First line: n.\nSecond line: n integers.",
    outputFormat: "The second largest distinct value, or -1.",
    constraints: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9",
    sampleInput: "5\n3 9 2 9 4",
    sampleOutput: "4",
    defaultMarks: 25,
    testCases: [
      { kind: "SAMPLE" as const, input: "5\n3 9 2 9 4", expectedOutput: "4", points: 1 },
      { kind: "SAMPLE" as const, input: "3\n7 7 7", expectedOutput: "-1", points: 1 },
      { kind: "HIDDEN" as const, input: "2\n1 2", expectedOutput: "1", points: 2 },
      { kind: "HIDDEN" as const, input: "4\n10 9 8 7", expectedOutput: "9", points: 2 },
      { kind: "EDGE" as const, input: "1\n5", expectedOutput: "-1", points: 3 },
    ],
  },
];
