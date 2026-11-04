/** `defaults` where `values` says nothing (absent, or left empty by the latest task). */
export const withDefaults = (values: Record<string, unknown>, defaults?: Record<string, unknown>): Record<string, unknown> => {
  if (!defaults) return values;
  const merged = { ...values };
  for (const [key, value] of Object.entries(defaults)) {
    if (merged[key] === null || merged[key] === undefined) merged[key] = value;
  }
  return merged;
};
