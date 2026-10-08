import { Button } from "@/core/ui/button";
import { Link2 } from "lucide-react";
import { useEffect } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { usePortsRoot } from "./PortsRootContext";
import { dependencyFieldName } from "./portPaths";
import { pathToName } from "./utils";

/**
 * The form field a widget's `followValue` names (a port path: `a` a sibling,
 * `a..b` into one, `/a` from the ports root), or undefined when it follows
 * nothing.
 */
export const followFieldName = (
  followValue: string | null | undefined,
  path: readonly string[],
  portsRoot: readonly string[],
): string | undefined => {
  if (!followValue) return undefined;
  const name = dependencyFieldName(followValue, path, portsRoot);
  // A port cannot follow itself.
  return name && name !== pathToName([...path]) ? name : undefined;
};

/**
 * `followValue`: the port mirrors another port's value until the user edits
 * it. The mirrored value is written without dirtying the field, so "dirty"
 * means exactly "the user took over"; the link re-attaches it.
 */
export const FollowValue = ({
  followValue,
  path,
}: {
  followValue: string | null | undefined;
  path: string[];
}) => {
  const source = followFieldName(followValue, path, usePortsRoot());
  if (!source) return null;
  return <Following source={source} name={pathToName(path)} />;
};

const Following = ({ source, name }: { source: string; name: string }) => {
  const { control, setValue, getValues, resetField } = useFormContext();
  const sourceValue = useWatch({ control, name: source });
  const { dirtyFields } = useFormState({ control, name });
  const detached = name.split(".").reduce<unknown>(
    (at, key) => (at && typeof at === "object" ? (at as Record<string, unknown>)[key] : undefined),
    dirtyFields,
  );
  const isDetached = Boolean(detached);

  useEffect(() => {
    if (isDetached || sourceValue === undefined) return;
    if (Object.is(getValues(name), sourceValue)) return;
    setValue(name, sourceValue, { shouldValidate: true, shouldDirty: false });
  }, [getValues, isDetached, name, setValue, sourceValue]);

  if (!isDetached) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="absolute top-0 right-0 text-muted-foreground"
      title="Follow the linked value again"
      aria-label="Follow the linked value again"
      onClick={() => resetField(name, { defaultValue: sourceValue })}
    >
      <Link2 />
    </Button>
  );
};
