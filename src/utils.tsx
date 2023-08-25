export function enum_to_options<T extends object>(
  e: T
): { label: string; value: string }[] {
  return Object.keys(e).map((key: any) => ({
    label: (e as any)[key],
    value: key,
  }));
}

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  if (value === null || value === undefined) return false;
  return true;
}
