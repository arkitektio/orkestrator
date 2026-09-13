import { PortEffectFragment } from "@/rekuest/api/graphql";
import {
  dependencyScope,
  parsePortCall,
  evaluatePortCall,
} from "@/rekuest/widgets/portCalls";
import { dependencyFieldName } from "@/rekuest/widgets/portPaths";
import { usePortsRoot } from "@/rekuest/widgets/PortsRootContext";
import { MappablePort } from "@/rekuest/widgets/types";
import { pathToName } from "@/rekuest/widgets/utils";
import React, { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

let unserializableCounter = 0;

/**
 * Whether a hide effect currently SHOWS its port.
 *
 * The effect's call (see `rekuest/widgets/portCalls.ts`) is evaluated against
 * the port's own value and its declared dependencies, which are the only form
 * fields subscribed to. Both are addressed by the port's react-hook-form
 * `path` (not its bare key), so effects work on forms that nest args under a
 * prefix and on ports inside models. A call that cannot be evaluated keeps the
 * port visible and reports the error once, so a broken rule never hides an
 * input.
 */
export const useEffectOn = (
  effect: PortEffectFragment,
  port: MappablePort,
  path: readonly string[],
) => {
  const { control } = useFormContext();
  const portsRoot = usePortsRoot();
  const pathKey = pathToName([...path]);
  const rootKey = pathToName([...portsRoot]);

  const names = useMemo(
    () => [
      pathKey,
      ...effect.dependencies.map((name) =>
        dependencyFieldName(name, pathKey.split("."), rootKey ? rootKey.split(".") : []),
      ),
    ],
    [effect.dependencies, pathKey, rootKey],
  );
  const watched = useWatch({ control, name: names }) as unknown[];

  // `watched` is a fresh array every render; key the evaluation on its
  // content so a parent re-render does not re-run every effect's call.
  const watchedKey = useMemo(() => {
    try {
      return JSON.stringify(watched);
    } catch {
      // Unserializable value: fall back to a fresh key (re-evaluate).
      return `unserializable:${++unserializableCounter}`;
    }
  }, [watched]);

  const rawCall = effect.call;
  const parsed = useMemo(() => parsePortCall(rawCall), [rawCall]);

  const { show, error } = useMemo(() => {
    const [value, ...dependencyValues] = watched;
    const result = parsed.ok
      ? evaluatePortCall(parsed.value, {
          value,
          dependencies: dependencyScope(effect.dependencies, dependencyValues),
        })
      : parsed;

    return result.ok
      ? { show: Boolean(result.value), error: null }
      : { show: true, error: result.error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect.dependencies, parsed, watchedKey]);

  // Reported once per distinct error, not per render.
  useEffect(() => {
    if (error) console.error(`Hide effect on port "${port.key}": ${error}`);
  }, [error, port.key]);

  return show;
};

export const HideEffect = ({
  effect,
  port,
  path,
  children,
}: {
  effect: PortEffectFragment;
  port: MappablePort;
  path: string[];
  children?: React.ReactNode;
}) => {
  const effectOn = useEffectOn(effect, port, path);

  if (!effectOn) {
    return null;
  }

  return children;
};
