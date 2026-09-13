import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

/**
 * Resolve a widget dependency path to the form field it refers to.
 *
 * - With no widget path (top-level form), the dependency is the field name.
 * - `/a/b` is absolute from the form root.
 * - `a/b` is relative to the widget's parent.
 */
const resolveDependencyName = (wanted_path: string, my_path: string[]) => {
  if (my_path.length === 0) {
    return wanted_path;
  }

  let fullPath: string[];
  if (wanted_path.startsWith("/")) {
    fullPath = wanted_path.slice(1).split("/");
  } else {
    const parentPath = my_path.slice(0, -1);
    fullPath = [...parentPath, ...wanted_path.split("/")];
  }

  return fullPath.join(".");
};

let unserializableCounter = 0;

export const useWidgetDependencies = (props: {
  widget: {
    dependencies?: string[] | null | undefined;
  };
  path: string[];
}) => {
  const { control } = useFormContext();
  const dependencies = props.widget?.dependencies;
  const pathKey = props.path.join(".");

  const names = useMemo(
    () => (dependencies || []).map((wanted) => resolveDependencyName(wanted, props.path)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependencies, pathKey],
  );

  // Subscribe to exactly the dependency fields. The previous implementation
  // re-read the whole form on every `formState` change, which re-issued every
  // search widget's query on every keystroke anywhere in the form.
  const watched = useWatch({ control, name: names }) as unknown[];

  // Key on the values so `values` (and everything memoized on it downstream)
  // only changes when a dependency actually changes.
  const watchedKey = useMemo(() => {
    try {
      return JSON.stringify(watched);
    } catch {
      // Unserializable dependency value: fall back to the array identity.
      return `unserializable:${++unserializableCounter}`;
    }
  }, [watched]);

  const foundValues = useMemo(() => {
    const result: Record<string, unknown> = {};
    watched.forEach((value, index) => {
      result["arg" + index] = value;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey]);

  const met = useMemo(
    () =>
      !dependencies ||
      dependencies.length == 0 ||
      watched.every((value) => value !== undefined && value !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependencies, watchedKey],
  );

  return { values: foundValues, met };
};

export default useWidgetDependencies;
