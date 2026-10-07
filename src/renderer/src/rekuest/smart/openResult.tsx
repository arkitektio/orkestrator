import { RowIconButton } from "@/core/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { smartRegistry } from "@/core/smart/registry";
import { structure } from "@/core/smart/structure";
import type { Structure } from "@/core/types";
import { PortKind, TaskEventFragment, TaskEventKind } from "@/rekuest/api/graphql";
import { ArrowUpRight } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * "Run, then open the result": one arrow per structure a row's action hands
 * back, next to the row's pin. It starts the same run a select does and, once
 * the task completes, navigates to what that return port yielded.
 */

export type OpenableReturn = {
  key: string;
  kind: PortKind;
  identifier?: string | null;
  label?: string | null;
};

type ArgLike = { key: string };

/** The returns that are a structure this app has a page for. */
export const openableReturns = <T extends OpenableReturn>(
  returns: readonly T[] | null | undefined,
): T[] =>
  (returns ?? []).filter(
    (port) =>
      port.kind === PortKind.Structure &&
      !!port.identifier &&
      !!smartRegistry.findModel(port.identifier),
  );

/**
 * Whether the selection alone fills every arg, so a select runs at once. With
 * an arg left over the row opens the assign dialog instead, and the run that
 * follows is the dialog's: there is nothing here to open a result of.
 */
export const runsDirectly = (
  args: readonly ArgLike[],
  props: Pick<SmartContextProps, "objects" | "partners">,
): boolean =>
  args.every(
    (_, index) =>
      (index === 0 && props.objects.length > 0) ||
      (index === 1 && (props.partners?.length ?? 0) > 0),
  );

/**
 * What a yield holds at `port`: the wire form `{ __identifier, object }`, or a
 * bare id. Null when the port came back empty.
 */
export const returnedStructure = (
  port: OpenableReturn,
  returns: unknown,
): Structure | null => {
  if (!port.identifier || !returns || typeof returns !== "object") return null;
  const value = (returns as Record<string, unknown>)[port.key];
  const id =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).object
      : value;
  return typeof id === "string" || typeof id === "number" ? structure(port.identifier, id) : null;
};

/** "Run, then open Image"; the port's label too when two returns share a type. */
export const openResultLabel = (port: OpenableReturn, all: readonly OpenableReturn[]) => {
  const name = smartRegistry.getDisplayName(port.identifier ?? "");
  const ambiguous = all.filter((other) => other.identifier === port.identifier).length > 1;
  return ambiguous ? `Run, then open ${name} (${port.label || port.key})` : `Run, then open ${name}`;
};

type OnTaskEvent = (event: TaskEventFragment) => void;

/**
 * Wraps a row's task callback: the row still hears every event, and on
 * completion the last yield's structure at `port` is opened. The row may be
 * long unmounted by then (its menu closed); the tracker keeps this alive.
 */
export const useOpenResult = () => {
  const navigate = useNavigate();

  return React.useCallback(
    (port: OpenableReturn, onEvent: OnTaskEvent): OnTaskEvent => {
      let returns: unknown = null;
      return (event) => {
        if (event.returns != null) returns = event.returns;
        onEvent(event);
        if (event.kind !== TaskEventKind.Completed) return;
        const result = returnedStructure(port, returns);
        const path = result && smartRegistry.buildModelPath(result.identifier, result.id);
        if (path) navigate(path.startsWith("/") ? path : `/${path}`);
      };
    },
    [navigate],
  );
};

/** The arrows of one row. `onRun` starts the row's run for that port. */
export const OpenResultButtons = <T extends OpenableReturn>(props: {
  returns: readonly T[] | null | undefined;
  onRun: (port: T) => void;
}) => {
  const ports = openableReturns(props.returns);
  if (ports.length === 0) return null;

  return (
    <>
      {ports.map((port) => (
        <RowIconButton
          key={port.key}
          label={openResultLabel(port, ports)}
          onClick={() => props.onRun(port)}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </RowIconButton>
      ))}
    </>
  );
};
