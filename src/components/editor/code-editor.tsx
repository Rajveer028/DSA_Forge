"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import { Spinner } from "@/components/ui/misc";
import { MONACO_LANGUAGE } from "@/lib/constants";
import type { Language } from "@/generated/prisma/enums";

// Monaco is heavy and browser-only: never include it in the server bundle.
// Pointing the loader at the bundled copy has to happen before the editor
// mounts, so it rides along with this same dynamic import.
const MonacoEditor = dynamic(
  async () => {
    const [{ configureMonaco }, mod] = await Promise.all([
      import("@/components/editor/monaco-setup"),
      import("@monaco-editor/react"),
    ]);
    configureMonaco();
    return mod;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 bg-bg-elevated text-sm text-text-muted">
        <Spinner />
        Loading editor...
      </div>
    ),
  },
);

let themesRegistered = false;

/** Editor themes derived from the same palette as the rest of the product. */
function registerThemes(monaco: Monaco) {
  if (themesRegistered) return;
  themesRegistered = true;

  monaco.editor.defineTheme("forge-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5b6577", fontStyle: "italic" },
      { token: "keyword", foreground: "60a5fa" },
      { token: "string", foreground: "4ade80" },
      { token: "number", foreground: "fbbf24" },
      { token: "type", foreground: "a78bfa" },
      { token: "identifier", foreground: "e2e8f0" },
      { token: "delimiter", foreground: "94a3b8" },
    ],
    colors: {
      "editor.background": "#0b1018",
      "editor.foreground": "#e2e8f0",
      "editorLineNumber.foreground": "#3f4a5f",
      "editorLineNumber.activeForeground": "#94a3b8",
      "editor.lineHighlightBackground": "#141b28",
      "editor.selectionBackground": "#1d4ed855",
      "editorCursor.foreground": "#3b82f6",
      "editorIndentGuide.background1": "#1e2634",
      "editorIndentGuide.activeBackground1": "#2f3a4d",
      "editorWidget.background": "#111826",
      "editorWidget.border": "#232c3d",
      "editorSuggestWidget.background": "#111826",
      "scrollbarSlider.background": "#232c3d99",
    },
  });

  monaco.editor.defineTheme("forge-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a94a6", fontStyle: "italic" },
      { token: "keyword", foreground: "1d4ed8" },
      { token: "string", foreground: "15803d" },
      { token: "number", foreground: "b45309" },
      { token: "type", foreground: "6d28d9" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#0f172a",
      "editor.lineHighlightBackground": "#f1f5f9",
      "editorLineNumber.foreground": "#94a3b8",
    },
  });
}

export interface CodeEditorProps {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  fontSize?: number;
  tabSize?: number;
  showLineNumbers?: boolean;
  readOnly?: boolean;
  height?: string;
  onRun?: () => void;
  onSubmit?: () => void;
}

export function CodeEditor({
  value,
  language,
  onChange,
  fontSize = 14,
  tabSize = 4,
  showLineNumbers = true,
  readOnly = false,
  height = "100%",
  onRun,
  onSubmit,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);
  const runRef = React.useRef(onRun);
  const submitRef = React.useRef(onSubmit);

  React.useEffect(() => {
    runRef.current = onRun;
    submitRef.current = onSubmit;
  }, [onRun, onSubmit]);

  function handleMount(instance: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = instance;

    // Ctrl/Cmd+Enter runs, Ctrl/Cmd+Shift+Enter submits.
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
    instance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => submitRef.current?.(),
    );
  }

  return (
    <MonacoEditor
      height={height}
      language={MONACO_LANGUAGE[language]}
      theme={resolvedTheme === "light" ? "forge-light" : "forge-dark"}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      beforeMount={registerThemes}
      onMount={handleMount}
      options={{
        fontSize,
        tabSize,
        // Input goes through the classic hidden textarea rather than the newer
        // EditContext path Monaco enables by default. Measured against this
        // workspace, EditContext dropped typed characters and failed the
        // Ctrl+C round-trip to the system clipboard in two runs out of three;
        // the textarea path passed every time. Revisit once EditContext loses
        // the "experimental" label upstream.
        editContext: false,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        fontLigatures: true,
        lineNumbers: showLineNumbers ? "on" : "off",
        readOnly,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderLineHighlight: "line",
        padding: { top: 14, bottom: 14 },
        automaticLayout: true,
        wordWrap: "on",
        bracketPairColorization: { enabled: true },
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        formatOnPaste: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        overviewRulerLanes: 0,
        stickyScroll: { enabled: false },
      }}
    />
  );
}

/** Read-only viewer used for editorials, previous submissions and solutions. */
export function CodeViewer({
  code,
  language,
  height = "320px",
}: {
  code: string;
  language: Language;
  height?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle" style={{ height }}>
      <CodeEditor
        value={code}
        language={language}
        onChange={() => undefined}
        readOnly
        height="100%"
      />
    </div>
  );
}
