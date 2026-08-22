"use client";

/**
 * Put a string on the clipboard, by whichever route the browser allows.
 *
 * The async Clipboard API is the one to want and it is refused more often
 * than its reputation suggests: without a focused document it throws
 * `NotAllowedError`, and some Firefox configurations gate it behind a
 * permission. `execCommand("copy")` is deprecated and still works everywhere,
 * so it is the second attempt rather than no attempt.
 *
 * Returns whether anything actually landed. Every call site used to swallow
 * the rejection and show nothing at all, which is indistinguishable from a
 * broken button — so the boolean is the point of this function as much as the
 * fallback is.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through — an exception here is a refusal, not a bug.
  }

  /* The old way: a real, selectable, off-screen node, because `execCommand`
     copies the *selection* and there has to be one. Not `display: none` or
     `hidden`, neither of which can hold a selection. */
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;";
  document.body.appendChild(field);

  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
