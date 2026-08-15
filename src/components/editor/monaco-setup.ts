"use client";

import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";

/**
 * Serves Monaco from the copy in `node_modules` rather than a CDN.
 *
 * `@monaco-editor/react` defaults to fetching the editor from jsdelivr at
 * runtime. That makes the workspace depend on the public internet — which the
 * rest of this app deliberately does not (SQLite on disk, local auth, local
 * execution) — and it silently loads a *different* build from the
 * `monaco-editor` version pinned in package.json. When the CDN is slow,
 * filtered or offline, the core editor can come up while lazily-fetched
 * modules do not, leaving an editor that accepts typed characters but drops
 * clipboard and multi-character edits.
 *
 * Importing the package directly makes the bundle self-contained and keeps the
 * runtime on the same version as the `monaco-editor` types we compile against.
 */

let configured = false;

export function configureMonaco() {
  if (configured || typeof window === "undefined") return;
  configured = true;

  // C, C++, Java and Python are highlighted by Monarch grammars on the main
  // thread, so the generic editor worker (word-based suggestions, diffing,
  // link detection) is the only one this app needs. `MonacoEnvironment` is
  // declared globally by the `monaco-editor` types.
  self.MonacoEnvironment = {
    getWorker: () =>
      new Worker(new URL("./monaco.worker.ts", import.meta.url), { type: "module" }),
  };

  loader.config({ monaco });
}
