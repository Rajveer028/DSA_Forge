import type { Difficulty, Language } from "@/generated/prisma/enums";

export const APP_NAME = "DSA Forge";
export const APP_TAGLINE = "Forge Your DSA Skills. Crack Your Dream Interview.";
export const APP_DESCRIPTION =
  "An AI-powered platform for DSA practice, company-focused interview preparation, and university coding assessments.";

export const LANGUAGES: Array<{
  value: Language;
  label: string;
  monaco: string;
  extension: string;
  comment: string;
}> = [
  { value: "C", label: "C", monaco: "c", extension: "c", comment: "//" },
  { value: "CPP", label: "C++", monaco: "cpp", extension: "cpp", comment: "//" },
  { value: "JAVA", label: "Java", monaco: "java", extension: "java", comment: "//" },
  { value: "PYTHON", label: "Python", monaco: "python", extension: "py", comment: "#" },
];

export const LANGUAGE_LABEL: Record<Language, string> = {
  C: "C",
  CPP: "C++",
  JAVA: "Java",
  PYTHON: "Python",
};

export const MONACO_LANGUAGE: Record<Language, string> = {
  C: "c",
  CPP: "cpp",
  JAVA: "java",
  PYTHON: "python",
};

export const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  EASY: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  HARD: "text-rose-400 bg-rose-500/10 border-rose-500/25",
};

export const DIFFICULTY_DOT: Record<Difficulty, string> = {
  EASY: "bg-emerald-400",
  MEDIUM: "bg-amber-400",
  HARD: "bg-rose-400",
};

/** Canonical topic catalogue — mirrored into the `topics` table by the seed. */
export const TOPICS: Array<{
  slug: string;
  name: string;
  category: string;
  description: string;
}> = [
  { slug: "arrays", name: "Arrays", category: "Foundations", description: "Contiguous storage, two pointers, prefix sums and in-place tricks." },
  { slug: "strings", name: "Strings", category: "Foundations", description: "Parsing, palindromes, pattern matching and character counting." },
  { slug: "linked-lists", name: "Linked Lists", category: "Foundations", description: "Pointer surgery, cycle detection, reversal and merging." },
  { slug: "stack", name: "Stack", category: "Linear Structures", description: "LIFO problems: parentheses, monotonic stacks, expression evaluation." },
  { slug: "queue", name: "Queue", category: "Linear Structures", description: "FIFO, deques, sliding windows and circular buffers." },
  { slug: "recursion", name: "Recursion", category: "Paradigms", description: "Base cases, recurrence relations and divide and conquer." },
  { slug: "searching", name: "Searching", category: "Paradigms", description: "Linear and binary search, search on answer space." },
  { slug: "sorting", name: "Sorting", category: "Paradigms", description: "Comparison sorts, counting sorts and custom comparators." },
  { slug: "hashing", name: "Hashing", category: "Paradigms", description: "Hash maps and sets for O(1) average lookup." },
  { slug: "trees", name: "Trees", category: "Hierarchical", description: "Binary trees, traversals, depth and structural properties." },
  { slug: "bst", name: "Binary Search Trees", category: "Hierarchical", description: "Ordered trees, validation, insertion, deletion and successors." },
  { slug: "heap", name: "Heap", category: "Hierarchical", description: "Priority queues, top-K selection and heap-based scheduling." },
  { slug: "graphs", name: "Graphs", category: "Networks", description: "BFS, DFS, shortest paths, topological order and connectivity." },
  { slug: "greedy", name: "Greedy", category: "Paradigms", description: "Exchange arguments, interval scheduling and local optima." },
  { slug: "backtracking", name: "Backtracking", category: "Paradigms", description: "Systematic search with pruning: permutations, subsets, puzzles." },
  { slug: "dp", name: "Dynamic Programming", category: "Paradigms", description: "Overlapping subproblems, memoisation and tabulation." },
  { slug: "bit-manipulation", name: "Bit Manipulation", category: "Advanced", description: "Masks, XOR tricks and bitwise arithmetic." },
  { slug: "math", name: "Math & Number Theory", category: "Advanced", description: "Primes, GCD, modular arithmetic and combinatorics." },
  { slug: "matrix", name: "Matrix", category: "Foundations", description: "2D traversal, rotation, spiral order and grid simulation." },
  { slug: "tries", name: "Tries", category: "Advanced", description: "Prefix trees for dictionary and autocomplete problems." },
  { slug: "advanced", name: "Advanced Algorithms", category: "Advanced", description: "Segment trees, DSU, string algorithms and flow." },
];

export const TOPIC_NAME: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.slug, t.name]),
);

export const CAREER_GOALS = [
  { value: "LEARN_DSA", label: "Learn DSA", description: "Build strong fundamentals from scratch" },
  { value: "UNIVERSITY_PREP", label: "University preparation", description: "Ace internal and semester assessments" },
  { value: "PLACEMENT_PREP", label: "Placement preparation", description: "Campus placement drives and aptitude rounds" },
  { value: "PRODUCT_COMPANY", label: "Product-based company", description: "FAANG-style algorithmic interviews" },
  { value: "SERVICE_COMPANY", label: "Service-based company", description: "Mass recruiters and coding assessments" },
  { value: "COMPETITIVE_PROGRAMMING", label: "Competitive programming", description: "Contests, speed and advanced algorithms" },
  { value: "INTERVIEW_PREP", label: "Interview preparation", description: "Mock rounds and communication practice" },
] as const;

export const DSA_LEVELS = [
  {
    value: "BEGINNER",
    label: "Beginner",
    description: "New to DSA — comfortable with basic syntax and loops.",
  },
  {
    value: "INTERMEDIATE",
    label: "Intermediate",
    description: "Solved arrays, strings and recursion; learning trees and graphs.",
  },
  {
    value: "ADVANCED",
    label: "Advanced",
    description: "Comfortable with DP, graphs and complexity analysis.",
  },
] as const;

export const ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Postgraduate",
  "Graduated",
];

export const STUDENT_CAPACITY_PRESETS = [23, 30, 40, 50];

export const SUBMISSION_STATUS_META: Record<
  string,
  { label: string; tone: "success" | "danger" | "warning" | "neutral" }
> = {
  PENDING: { label: "Pending", tone: "neutral" },
  RUNNING: { label: "Running", tone: "neutral" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  WRONG_ANSWER: { label: "Wrong Answer", tone: "danger" },
  COMPILATION_ERROR: { label: "Compilation Error", tone: "danger" },
  RUNTIME_ERROR: { label: "Runtime Error", tone: "danger" },
  TIME_LIMIT_EXCEEDED: { label: "Time Limit Exceeded", tone: "warning" },
  MEMORY_LIMIT_EXCEEDED: { label: "Memory Limit Exceeded", tone: "warning" },
  OUTPUT_LIMIT_EXCEEDED: { label: "Output Limit Exceeded", tone: "warning" },
  INTERNAL_ERROR: { label: "Internal Error", tone: "danger" },
};

export const PAGE_SIZE = 25;
