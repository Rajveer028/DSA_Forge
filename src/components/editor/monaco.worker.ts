/**
 * Worker entry point for the bundled Monaco.
 *
 * `new Worker(new URL(...))` only accepts a *relative* specifier the bundler
 * can trace, so this file exists purely to give it one — the bare package
 * import inside is resolved normally from here.
 *
 * Note the subpath: `monaco-editor`'s exports map is `"./*": "./esm/vs/*.js"`,
 * so the `esm/vs` prefix must be omitted or it resolves twice.
 */
import "monaco-editor/editor/editor.worker.js";
