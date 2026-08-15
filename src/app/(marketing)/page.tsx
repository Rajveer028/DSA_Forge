import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Code2,
  Cpu,
  GraduationCap,
  Layers,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HeroTerminal } from "@/components/marketing/hero-terminal";
import { APP_DESCRIPTION } from "@/lib/constants";

const PORTALS = [
  {
    id: "practice",
    icon: Code2,
    eyebrow: "Portal 01",
    title: "Practice Arena",
    blurb: "300 structured DSA problems.",
    description:
      "One hundred Easy, one hundred Medium and one hundred Hard problems spanning arrays through advanced algorithms — each with formal I/O, worked examples, hidden tests and a full editorial.",
    bullets: [
      "Monaco editor with C, C++, Java and Python",
      "Run against samples, submit against hidden and edge cases",
      "Progressive AI hints that guide instead of answering",
      "Reveal Answer with approach, intuition and complexity",
    ],
    href: "/practice",
    tone: "forge" as const,
  },
  {
    id: "interview",
    icon: Bot,
    eyebrow: "Portal 02",
    title: "AI Interview Prep",
    blurb: "Personalized company-focused preparation.",
    description:
      "Pick a target company and the adaptive engine reads your submissions, accuracy, hint usage and topic mastery to build a readiness score and a concrete plan for what to solve next.",
    bullets: [
      "Company-style problem sets, honestly labelled",
      "Readiness score with strong and weak topic breakdown",
      "AI-generated problems that pass a validation pipeline",
      "Post-submission code analysis and solution explanation",
    ],
    href: "/interview-prep",
    tone: "ai" as const,
  },
  {
    id: "university",
    icon: GraduationCap,
    eyebrow: "Portal 03",
    title: "University Assessment",
    blurb: "Create, schedule and evaluate coding tests.",
    description:
      "Faculty author their own problems and test cases, build a paper, assign 23 / 30 / 40 / 50 or any number of students, and let the platform mark every submission automatically.",
    bullets: [
      "Question bank with public, hidden, edge and stress cases",
      "Server-authoritative timer with automatic submission",
      "Partial scoring, ranking and class-wide analytics",
      "Structural code similarity as a review indicator",
    ],
    href: "/university",
    tone: "success" as const,
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Learning",
    body: "An adaptive engine that reads your real performance data and sequences the next topic and difficulty for you.",
  },
  {
    icon: Terminal,
    title: "Multi-language Compiler",
    body: "C, C++, Java and Python compiled and executed against every test case with per-case verdicts.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Evaluation",
    body: "Submissions run in an isolated sandbox with CPU, memory, process, filesystem and network limits.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    body: "Accuracy, streaks, topic mastery, coding time and assessment results in one continuous picture.",
  },
  {
    icon: Lightbulb,
    title: "Progressive Hints",
    body: "Three escalating nudges per problem — reframing, then technique, then algorithm outline. Never the answer.",
  },
  {
    icon: Timer,
    title: "Live Assessments",
    body: "Countdown, autosave, mark-for-review and automatic submission when the server-side timer expires.",
  },
  {
    icon: Layers,
    title: "Question Bank",
    body: "Faculty-authored problems with four classes of test case, reusable across any number of assessments.",
  },
  {
    icon: Trophy,
    title: "Achievements",
    body: "Milestones, streaks, difficulty masters and topic specialists that track genuine progress.",
  },
];

const STATS = [
  { value: "300", label: "Curated problems" },
  { value: "21", label: "DSA topics" },
  { value: "4", label: "Languages" },
  { value: "3", label: "Portals" },
];

export default function LandingPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="pointer-events-none absolute inset-0 forge-grid-bg" aria-hidden />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--forge-primary)) 0%, hsl(var(--forge-ai)) 55%, transparent 72%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="animate-fade-up">
            <Badge variant="forge" className="mb-6 gap-2 px-3 py-1">
              <Cpu className="size-3.5" />
              AI-powered DSA platform
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block text-text-primary">DSA FORGE</span>
              <span className="mt-3 block text-gradient-forge">
                Forge Your DSA Skills.
                <br />
                Crack Your Dream Interview.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
              {APP_DESCRIPTION}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="forge-glow">
                <Link href="/practice">
                  Start Practicing
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/interview-prep">
                  <Sparkles className="size-4 text-ai" />
                  Explore AI Prep
                </Link>
              </Button>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums text-text-primary">
                    {stat.value}
                  </dd>
                  <p className="mt-0.5 text-xs text-text-subtle">{stat.label}</p>
                </div>
              ))}
            </dl>
          </div>

          <HeroTerminal />
        </div>
      </section>

      {/* ------------------------------------------------------------- Portals */}
      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forge">
            Three portals, one platform
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything between your first array problem and your offer letter
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-muted">
            Practice, prepare and get assessed without switching tools. Each portal writes to the
            same progress model, so what you solve on Monday shapes what the engine recommends on
            Friday.
          </p>
        </div>

        <div className="mt-14 space-y-8">
          {PORTALS.map((portal, index) => (
            <Card
              key={portal.id}
              id={portal.id}
              className="scroll-mt-24 overflow-hidden border-border-subtle"
            >
              <div
                className={`grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        portal.tone === "forge"
                          ? "rounded-xl border border-forge/25 bg-forge/10 p-2.5 text-forge"
                          : portal.tone === "ai"
                            ? "rounded-xl border border-ai/25 bg-ai/10 p-2.5 text-ai"
                            : "rounded-xl border border-success/25 bg-success/10 p-2.5 text-success"
                      }
                    >
                      <portal.icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-text-subtle">
                        {portal.eyebrow}
                      </p>
                      <h3 className="text-xl font-semibold text-text-primary">{portal.title}</h3>
                    </div>
                  </div>

                  <p className="mt-5 text-lg font-medium text-text-primary">{portal.blurb}</p>
                  <p className="mt-2.5 leading-relaxed text-text-muted">{portal.description}</p>

                  <Button variant="secondary" asChild className="mt-6">
                    <Link href={portal.href}>
                      Open {portal.title}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>

                <ul className="space-y-3 rounded-xl border border-border-subtle bg-bg-elevated/60 p-5">
                  {portal.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-text-muted">
                      <span
                        className={
                          portal.tone === "forge"
                            ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-forge"
                            : portal.tone === "ai"
                              ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-ai"
                              : "mt-1.5 size-1.5 shrink-0 rounded-full bg-success"
                        }
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section className="border-y border-border-subtle bg-bg-elevated/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ai">
              Built like production software
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              The parts that usually get faked, built for real
            </h2>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-bg-elevated p-6 transition-colors hover:bg-surface">
                <feature.icon className="size-5 text-forge" />
                <h3 className="mt-4 font-medium text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- About */}
      <section id="about" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forge">About</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              A learning platform that refuses to hand you the answer
            </h2>
            <p className="mt-5 leading-relaxed text-text-muted">
              DSA Forge is built on one principle: AI should make you a better problem solver, not a
              faster copy-paster. Hints escalate gradually. Solutions stay behind an explicit
              confirmation and never mark a problem solved. Generated problems are compiled and run
              against their own reference solution before anyone sees them.
            </p>
            <p className="mt-4 leading-relaxed text-text-muted">
              For universities, every mark is computed server-side from verified judging results —
              timers, test ownership and student assignment are all enforced on the server, never in
              the browser.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Building2,
                title: "Company-honest labelling",
                body: "We never claim a problem was actually asked at a company unless it is verified. Everything else is labelled company-style or AI pattern practice.",
              },
              {
                icon: ShieldCheck,
                title: "Sandboxed execution",
                body: "Submitted code never touches the application process, the database, or any secret. It runs in a disposable, network-isolated container.",
              },
              {
                icon: Bot,
                title: "Swappable AI provider",
                body: "The AI layer sits behind one interface. Changing vendor or model is an environment variable, not a rewrite.",
              },
              {
                icon: GraduationCap,
                title: "Integrity indicators",
                body: "Similarity analysis flags pairs worth a human look. It never labels a student as cheating.",
              },
            ].map((item) => (
              <Card key={item.title} className="p-5">
                <item.icon className="size-5 text-ai" />
                <h3 className="mt-3.5 text-sm font-medium text-text-primary">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section className="border-t border-border-subtle">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-0 forge-grid-bg opacity-60" aria-hidden />
            <div className="relative">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Start forging today
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text-muted">
                Create an account, tell the engine where you are, and get a personalised path from
                your first array problem to your dream interview.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild className="forge-glow">
                  <Link href="/sign-up">
                    Create your account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/sign-in">I already have an account</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
