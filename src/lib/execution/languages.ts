import type { Language } from "@/generated/prisma/enums";

/**
 * Per-language toolchain description used by every sandbox driver.
 * Commands are argv arrays — never shell strings — so nothing submitted by a
 * user can be interpreted as shell syntax.
 */
export interface LanguageSpec {
  id: Language;
  label: string;
  fileName: string;
  /** Compile step, run inside the sandbox workdir. Omitted for interpreters. */
  compile?: { command: string; args: string[] };
  run: { command: string; args: string[] };
  /** Extra wall-clock allowance for JVM/compiler warm-up, in ms. */
  startupOverheadMs: number;
  dockerImage: string;
}

export const LANGUAGE_SPECS: Record<Language, LanguageSpec> = {
  C: {
    id: "C",
    label: "C",
    fileName: "main.c",
    compile: {
      command: "gcc",
      args: ["-O2", "-std=c11", "-static-libgcc", "-o", "program", "main.c", "-lm"],
    },
    run: { command: "./program", args: [] },
    startupOverheadMs: 0,
    dockerImage: "dsaforge/runner-c:latest",
  },
  CPP: {
    id: "CPP",
    label: "C++",
    fileName: "main.cpp",
    compile: {
      command: "g++",
      args: ["-O2", "-std=c++17", "-o", "program", "main.cpp"],
    },
    run: { command: "./program", args: [] },
    startupOverheadMs: 0,
    dockerImage: "dsaforge/runner-cpp:latest",
  },
  JAVA: {
    id: "JAVA",
    label: "Java",
    fileName: "Main.java",
    compile: { command: "javac", args: ["-encoding", "UTF-8", "Main.java"] },
    run: { command: "java", args: ["-Xss64m", "-XX:+UseSerialGC", "Main"] },
    startupOverheadMs: 600,
    dockerImage: "dsaforge/runner-java:latest",
  },
  PYTHON: {
    id: "PYTHON",
    label: "Python",
    fileName: "main.py",
    run: { command: "python3", args: ["-E", "-S", "main.py"] },
    startupOverheadMs: 200,
    dockerImage: "dsaforge/runner-python:latest",
  },
};

/**
 * Executable to launch for the local dev driver, resolved against the sandbox
 * workdir.
 *
 * The compiled binary must be addressed by absolute path. Windows resolves a
 * bare or relative program name against the *parent* process's directory, not
 * the child's, so spawning "program.exe" with cwd set to the sandbox fails with
 * ENOENT and every compiled submission reports a runtime error. POSIX resolves
 * "./program" correctly, but an absolute path is right on both.
 *
 * Interpreters are left alone: they are looked up on PATH, and their script
 * argument is resolved by the interpreter itself, relative to the child's cwd.
 */
export function localRunCommand(spec: LanguageSpec, isWindows: boolean, workdir: string) {
  if (spec.run.command === "./program") {
    const binary = isWindows ? "program.exe" : "program";
    // Not path.join: this module is imported by the browser bundle via the
    // language list, and "node:path" must not be pulled in with it.
    const separator = isWindows ? "\\" : "/";
    const base = workdir.endsWith(separator) ? workdir.slice(0, -1) : workdir;
    return { command: `${base}${separator}${binary}`, args: [] };
  }
  if (spec.run.command === "python3" && isWindows) {
    return { command: "python", args: spec.run.args };
  }
  return spec.run;
}

/** Generic starter code, used when a question has no language-specific stub. */
export const GENERIC_STARTER: Record<Language, string> = {
  C: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    // Read input from stdin, write the answer to stdout.

    return 0;
}
`,
  CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Read input from stdin, write the answer to stdout.

    return 0;
}
`,
  JAVA: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder out = new StringBuilder();

        // Read input from stdin, append the answer to \`out\`.

        System.out.print(out);
    }
}
`,
  PYTHON: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    # Read input from stdin, print the answer to stdout.

if __name__ == "__main__":
    main()
`,
};

export function starterFor(
  starterCode: unknown,
  language: Language,
): string {
  if (starterCode && typeof starterCode === "object") {
    const value = (starterCode as Record<string, unknown>)[language];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return GENERIC_STARTER[language];
}
