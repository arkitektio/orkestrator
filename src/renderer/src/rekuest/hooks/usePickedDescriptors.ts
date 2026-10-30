import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { useEffect, useState } from "react";

export type PickablePort = { key: string; identifier?: string | null };

/** A picked structure's id: the form holds a `{__identifier, object}` reference, or the id. */
const pickedId = (value: unknown): string | undefined => {
  const id = value !== null && typeof value === "object" ? (value as { object?: unknown }).object : value;
  return typeof id === "string" || typeof id === "number" ? String(id) : undefined;
};

/** What the structures picked for `ports` say of themselves, by port. Apollo caches the asking. */
export const usePickedDescriptors = (
  ports: readonly string[],
  allPorts: readonly PickablePort[],
  args: Record<string, unknown>,
) => {
  const { registry } = useWidgetRegistry();
  const [descriptors, setDescriptors] = useState<Record<string, Record<string, unknown>>>({});
  const picks = ports.flatMap((key) => {
    const identifier = allPorts.find((port) => port.key === key)?.identifier;
    const id = pickedId(args[key]);
    return identifier && id ? [{ key, identifier, id }] : [];
  });
  const picksKey = JSON.stringify(picks);

  useEffect(() => {
    let current = true;
    void Promise.all(
      picks.map(async ({ key, identifier, id }) => {
        const ward = registry?.getWard(identifier.slice(1).split("/")[0]);
        const described = await ward?.describe?.({ identifier, id }).catch(() => undefined);
        return [key, Object.fromEntries((described ?? []).map((d) => [d.key, d.value]))] as const;
      }),
    ).then((entries) => {
      if (current) setDescriptors(Object.fromEntries(entries));
    });
    return () => {
      current = false;
    };
    // `picksKey` is `picks` by value: every render hands in a new list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, picksKey]);

  return descriptors;
};
