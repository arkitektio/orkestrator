const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

const splitPathSegments = (path: string): string[] => {
  return path
    .replace(/^\//, '')
    .split(/[/.]/)
    .filter(Boolean);
};

const joinPathSegments = (segments: ReadonlyArray<string>): string => segments.join('/');

const decodeJsonLiteralString = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const firstCharacter = trimmed[0];
  const looksLikeJsonLiteral =
    firstCharacter === '"' ||
    firstCharacter === '[' ||
    firstCharacter === '{' ||
    firstCharacter === '-' ||
    (firstCharacter >= '0' && firstCharacter <= '9') ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null';

  if (!looksLikeJsonLiteral) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
};

const normalizeLiteralValue = (value: unknown): unknown => {
  return isString(value) ? decodeJsonLiteralString(value) : value;
};

const getValueAtPath = (dataModel: unknown, path: string): unknown => {
  if (!path) {
    return dataModel;
  }

  const segments = splitPathSegments(path);

  let current: unknown = dataModel;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
};

/**
 * The backend hands us either a bare array of root nodes or an envelope object
 * with a `uiComponents` array. Both shapes are in the wild, so every entry
 * point normalizes through here rather than re-implementing the check.
 */
const extractUiComponents = (uiComponents: unknown): unknown[] => {
  if (Array.isArray(uiComponents)) {
    return uiComponents;
  }

  if (isRecord(uiComponents) && Array.isArray(uiComponents.uiComponents)) {
    return uiComponents.uiComponents;
  }

  return [];
};

export {
  decodeJsonLiteralString,
  extractUiComponents,
  getValueAtPath,
  isRecord,
  isString,
  joinPathSegments,
  normalizeLiteralValue,
  splitPathSegments,
};
