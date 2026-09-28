/**
 * electron-updater hands release notes over in two shapes: one string for the
 * newest release, or — with `fullChangelog` — one `{ version, note }` per
 * release between the running version and the new one. From the GitHub
 * provider the text is the release body GitHub already rendered to HTML; other
 * feeds may carry Markdown. Normalised here to a list so the card renders one
 * shape.
 */
export type ReleaseNote = { version?: string; body: string };

export const normalizeReleaseNotes = (
  notes: unknown,
  version?: string,
): ReleaseNote[] | undefined => {
  if (typeof notes === "string") {
    return notes.trim() ? [{ version, body: notes }] : undefined;
  }
  if (Array.isArray(notes)) {
    const list = notes
      .filter(
        (n): n is { version?: unknown; note?: unknown } =>
          !!n && typeof n === "object",
      )
      .map((n) => ({
        version: typeof n.version === "string" ? n.version : undefined,
        body: typeof n.note === "string" ? n.note : "",
      }))
      .filter((n) => n.body.trim());
    return list.length ? list : undefined;
  }
  return undefined;
};

/** Whether the body is HTML (GitHub's rendering) rather than Markdown. */
export const looksLikeHtml = (body: string) => /<\/?[a-z][\w-]*[\s>/]/i.test(body);
