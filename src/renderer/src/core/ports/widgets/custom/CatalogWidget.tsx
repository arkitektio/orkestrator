import {
  BlokComponentHost,
  canHostBlokComponent,
  HOSTED_VALUE_ROOT,
} from "@/core/blok/renderer/BlokComponentHost";
import { portRequires } from "@/core/ports/engine/constraints";
import { dependencyScope } from "@/core/ports/engine/portCalls";
import { dependencyFieldName } from "@/core/ports/engine/portPaths";
import { portDescription, portLabel } from "@/core/ports/engine/portPresentation";
import { usePortsRoot } from "@/core/ports/engine/PortsRootContext";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/ui/form";
import { ReactNode, useCallback, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export type CatalogWidgetProps = InputWidgetProps & {
  /** The catalog component to render as this port's input. */
  component: string;
  /** Its props, as declared. They may read `value` and each dependency by its name. */
  componentProps: readonly unknown[];
  /** The other ports whose values the props may read. */
  dependencies?: readonly string[] | null;
  /** What to render when this client's catalog cannot render the component as declared. */
  fallback: ReactNode;
};

let unserializableCounter = 0;

/**
 * A catalog component as the input of a port, inside the form.
 *
 * The component reads the port's own value under the root `value` and each
 * declared dependency under its own name, exactly the roots the server lets a
 * widget's props reference. The form stays the owner of the value: what the
 * component writes to `value` is set on the field (a cleared `null` as
 * `undefined`, which is how the form says "not given"), and what the form
 * holds is what the component is shown.
 *
 * Label, description and validation message are the port's and are drawn
 * here, so a catalog component is only ever the control.
 */
export const CatalogWidget = ({
  component,
  componentProps,
  dependencies,
  fallback,
  port,
  widget,
  path,
}: CatalogWidgetProps) => {
  const form = useFormContext();
  const portsRoot = usePortsRoot();
  const name = pathToName(path);
  const rootKey = pathToName([...portsRoot]);
  const dependencyKey = (dependencies ?? []).join("\n");

  const names = useMemo(
    () => [
      name,
      ...(dependencyKey ? dependencyKey.split("\n") : []).map((dependency) =>
        dependencyFieldName(dependency, name.split("."), rootKey ? rootKey.split(".") : []),
      ),
    ],
    [name, dependencyKey, rootKey],
  );
  const watched = useWatch({ control: form.control, name: names }) as unknown[];

  // `watched` is a fresh array every render; the data model must only change
  // when a value does, or every render would reset the component's runtime.
  const watchedKey = useMemo(() => {
    try {
      return JSON.stringify(watched);
    } catch {
      return `unserializable:${++unserializableCounter}`;
    }
  }, [watched]);

  const data = useMemo(() => {
    const [value, ...dependencyValues] = watched;
    return {
      ...dependencyScope(dependencyKey ? dependencyKey.split("\n") : [], dependencyValues),
      // Last: a dependency named `value` cannot shadow the port's own.
      [HOSTED_VALUE_ROOT]: value ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey, dependencyKey]);

  const onValue = useCallback(
    (next: unknown) => {
      form.setValue(name, next ?? undefined, { shouldValidate: true, shouldDirty: true });
    },
    [form, name],
  );

  const requiresKey = JSON.stringify(portRequires(port));
  const blokPort = useMemo(
    () => ({ identifier: port.identifier ?? undefined, requires: JSON.parse(requiresKey) }),
    [port.identifier, requiresKey],
  );

  // Decided before the field is drawn: the fallback is a whole widget with a
  // label of its own, and must not be nested under this one's.
  const propsKey = JSON.stringify(componentProps);
  const hostable = useMemo(
    () => canHostBlokComponent(component, JSON.parse(propsKey) as unknown[]),
    [component, propsKey],
  );
  if (!hostable) return <>{fallback}</>;

  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem className="flex flex-col">
          <FormLabel>{portLabel(port)}</FormLabel>
          <BlokComponentHost
            component={component}
            props={componentProps}
            data={data}
            onValue={onValue}
            port={blokPort}
            fallback={fallback}
          />
          {port.description && <FormDescription>{portDescription(port, widget)}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
