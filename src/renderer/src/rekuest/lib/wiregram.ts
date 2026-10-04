import type { WiregramInput } from "../api/graphql";

/**
 * A wiregram is one document of automation: schedules and triggers, each
 * naming its agent and interface by name, importable into any organization.
 * This reads a document a user hands over (a file, a paste, a stored
 * `Wiregram.document`) into the input `importWiregram` takes.
 */
export type WiregramSummary = {
  key: string;
  name: string;
  description: string | null;
  schedules: number;
  triggers: number;
};

export type ParsedWiregram =
  | { ok: true; input: WiregramInput; summary: WiregramSummary }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/**
 * The keys of one level as the input spells them. A document written by
 * another tool may use snake_case (`interval_seconds`); the values (a rule's
 * `args`, a condition's `value`) are the user's and stay as they are.
 */
const camelKeys = (value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value).map(([key, entry]) => [camel(key), entry]));

const rules = (value: unknown, what: string): Record<string, unknown>[] => {
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`"${what}" must be a list of rules.`);
  }
  return value.map(camelKeys);
};

export const readWiregram = (document: unknown): ParsedWiregram => {
  if (!isRecord(document)) return { ok: false, error: "A wiregram is a JSON object." };
  const top = camelKeys(document);
  if (typeof top.key !== "string" || !top.key) {
    return { ok: false, error: 'It has no "key": what the document calls itself.' };
  }
  if (typeof top.name !== "string" || !top.name) {
    return { ok: false, error: 'It has no "name".' };
  }
  try {
    const schedules = rules(top.schedules, "schedules");
    const triggers = rules(top.triggers, "triggers");
    const description = typeof top.description === "string" ? top.description : null;
    return {
      ok: true,
      // the server checks each rule; here only the document's shape is known
      input: { key: top.key, name: top.name, description, schedules, triggers } as WiregramInput,
      summary: {
        key: top.key,
        name: top.name,
        description,
        schedules: schedules.length,
        triggers: triggers.length,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const parseWiregram = (text: string): ParsedWiregram => {
  if (!text.trim()) return { ok: false, error: "Nothing to import yet." };
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return { ok: false, error: "This is not valid JSON." };
  }
  return readWiregram(document);
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "2 schedules · 1 trigger". */
export const describeWiregram = (summary: { schedules: number; triggers: number }) =>
  [plural(summary.schedules, "schedule"), plural(summary.triggers, "trigger")].join(" · ");

/** A key from a name: lowercase words joined by dashes. */
export const keyFromName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Hand a document to the user as a file. */
export const downloadWiregram = (key: string, document: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
  );
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${key || "wiregram"}.wiregram.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
