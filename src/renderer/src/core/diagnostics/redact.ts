/**
 * What the recorder strips before it keeps anything: a report is read by
 * other people, so a credential must never get as far as the buffer.
 */
const MAX_TEXT = 2000;
const MAX_DEPTH = 6;
const MAX_ITEMS = 50;

const SECRET_KEY = /pass(word|phrase)?|token|secret|authorization|credential|api[-_]?key|signature|cookie/i;
const SECRET_PARAM =
  /([?&](?:x-amz-[a-z-]+|token|access_token|refresh_token|id_token|code|signature|sig|key|secret|password)=)[^&\s"'<>]+/gi;

export const REDACTED = "<redacted>";

/** One line of text, without credentials, cut to a length a report can carry. */
export const redactText = (text: string, max: number = MAX_TEXT): string => {
  const clean = text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, `Bearer ${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "<jwt>")
    .replace(SECRET_PARAM, `$1${REDACTED}`);
  return clean.length > max ? `${clean.slice(0, max)}… (${clean.length - max} more characters)` : clean;
};

/**
 * A JSON-safe copy of `value`: values under secret-looking keys are masked,
 * strings are redacted, and depth, list length and text length are bounded
 * (variables can be anything, including a whole uploaded file).
 */
export const redactValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return `<${typeof value}>`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return redactText(`${value.name}: ${value.message}`);
  if (typeof Blob !== "undefined" && value instanceof Blob) return `<file ${value.size} bytes>`;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return "<binary>";
  if (depth >= MAX_DEPTH) return "<nested>";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ITEMS).map((item) => redactValue(item, depth + 1));
    if (value.length > MAX_ITEMS) items.push(`… ${value.length - MAX_ITEMS} more`);
    return items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>).slice(0, MAX_ITEMS)) {
    out[key] = SECRET_KEY.test(key) && inner != null && inner !== "" ? REDACTED : redactValue(inner, depth + 1);
  }
  return out;
};

/** A console argument as text: an error as its stack, an object as JSON. */
export const formatArg = (arg: unknown): string => {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(redactValue(arg)) ?? String(arg);
  } catch {
    return String(arg);
  }
};
