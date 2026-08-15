"use client";

import * as React from "react";
import { Check, Circle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const CODE_LINES = [
  { text: "class Solution {", indent: 0 },
  { text: "public:", indent: 0 },
  { text: "vector<int> twoSum(vector<int>& a, int t) {", indent: 1 },
  { text: "unordered_map<int,int> seen;", indent: 2 },
  { text: "for (int i = 0; i < a.size(); ++i) {", indent: 2 },
  { text: "int need = t - a[i];", indent: 3 },
  { text: "if (seen.count(need))", indent: 3 },
  { text: "return {seen[need], i};", indent: 4 },
  { text: "seen[a[i]] = i;", indent: 3 },
  { text: "}", indent: 2 },
  { text: "return {};", indent: 2 },
  { text: "}", indent: 1 },
  { text: "};", indent: 0 },
];

const CASES = [
  { label: "Test Case 1", detail: "[2,7,11,15], 9" },
  { label: "Test Case 2", detail: "[3,2,4], 6" },
  { label: "Test Case 3", detail: "[3,3], 6" },
];

/**
 * Decorative hero panel: a compressed replica of the real workspace with a
 * looping "run" so the landing page shows the product rather than a stock image.
 */
export function HeroTerminal() {
  const [passed, setPassed] = React.useState(0);
  const [running, setRunning] = React.useState(true);

  React.useEffect(() => {
    if (!running) return;
    if (passed >= CASES.length) {
      const reset = setTimeout(() => {
        setPassed(0);
        setRunning(true);
      }, 3200);
      return () => clearTimeout(reset);
    }
    const timer = setTimeout(() => setPassed((value) => value + 1), 620);
    return () => clearTimeout(timer);
  }, [passed, running]);

  const complete = passed >= CASES.length;

  return (
    <div className="animate-fade-up [animation-delay:120ms]">
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 font-mono text-xs text-text-subtle">two-sum.cpp</span>
          <span className="ml-auto rounded-md border border-border-subtle px-2 py-0.5 font-mono text-[0.65rem] text-text-subtle">
            C++
          </span>
        </div>

        <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.72rem] leading-6 sm:text-xs">
          <code>
            {CODE_LINES.map((line, index) => (
              <div key={index} className="flex gap-4">
                <span className="w-5 shrink-0 select-none text-right text-text-subtle/50">
                  {index + 1}
                </span>
                <span
                  className="text-text-muted"
                  style={{ paddingLeft: `${line.indent * 1.1}rem` }}
                >
                  {highlight(line.text)}
                </span>
              </div>
            ))}
          </code>
        </pre>

        <div className="border-t border-border-subtle bg-surface/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            {complete ? (
              <>
                <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="size-3" />
                </span>
                <span className="font-medium text-success">Accepted</span>
                <span className="text-text-subtle">· 3 / 3 passed · 4 ms · 12.1 MB</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 animate-pulse text-forge" />
                <span className="text-text-muted">Running test cases…</span>
              </>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            {CASES.map((testCase, index) => {
              const done = index < passed;
              return (
                <div
                  key={testCase.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 font-mono text-[0.68rem] transition-colors duration-300",
                    done
                      ? "border-success/25 bg-success/5 text-success"
                      : "border-border-subtle bg-bg-elevated text-text-subtle",
                  )}
                >
                  {done ? <Check className="size-3" /> : <Circle className="size-3" />}
                  <span className="font-sans font-medium">{testCase.label}</span>
                  <span className="ml-auto truncate">{testCase.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-text-subtle">
        The real workspace — Monaco editor, live verdicts, per-case detail.
      </p>
      <button
        type="button"
        onClick={() => {
          setPassed(0);
          setRunning(true);
        }}
        className="sr-only"
      >
        Replay demo
      </button>
    </div>
  );
}

const KEYWORDS = /\b(class|public|private|return|for|if|int|vector|unordered_map|auto|while)\b/g;

function highlight(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(KEYWORDS)) {
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <span key={`${start}-${match[0]}`} className="text-forge">
        {match[0]}
      </span>,
    );
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
