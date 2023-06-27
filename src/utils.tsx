
export function enum_to_options<T extends object>(
  e: T
): { label: string; value: string }[] {
  return Object.keys(e).map((key: any) => ({
    label: (e as any)[key],
    value: key,
  }));
}
