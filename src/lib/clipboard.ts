/**
 * Copies text to the clipboard, falling back when the async Clipboard API is
 * unavailable.
 *
 * `navigator.clipboard` only exists in a secure context. `localhost` counts as
 * one, but the dev server also advertises a LAN URL (`http://192.168.x.x:3000`)
 * and opening the app that way — from a phone, or a second machine — leaves
 * `navigator.clipboard` undefined entirely. The `execCommand` path still works
 * there, so fall through to it rather than telling the user their browser
 * blocked something it never offered.
 *
 * Returns whether the text made it to the clipboard.
 */
export async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or a transient failure — try the legacy path below.
    }
  }

  if (typeof document === "undefined") return false;

  // execCommand("copy") only reads from a focused, selected, on-screen node,
  // so the textarea has to be in the layout — just visually out of the way.
  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.top = "0";
  scratch.style.left = "-9999px";
  scratch.style.opacity = "0";
  document.body.appendChild(scratch);

  const previous = document.activeElement as HTMLElement | null;
  try {
    scratch.select();
    scratch.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(scratch);
    previous?.focus?.();
  }
}
