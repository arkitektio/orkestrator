import { AssignWidgetFragment } from "@/rekuest/api/graphql";
import { notEmpty } from "@/core/util/utils";
import { EffectWrapper } from "@/core/ports/engine/EffectWrapper";
import { PortsRootContext } from "@/core/ports/engine/PortsRootContext";
import { ArgsContainerProps } from "@/core/ports/engine/tailwind";
import { ArgPort, PortGroup, PortOptions, WidgetRegistryType } from "@/core/ports/engine/types";
import { portSize } from "@/core/ports/engine/portPresentation";
import { FollowValue } from "@/core/ports/engine/useFollowValue";
import { pathToName, portHash } from "@/core/ports/engine/utils";
import { cn } from "@/core/util/utils";
import React, { useMemo } from "react";
import { useController } from "react-hook-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { PORT_GRID, PORT_STACK, portSpanClass } from "./gridColumns";

export { portHash };

export type FilledGroup = PortGroup & {
  filledPorts: ArgPort[];
};

const EMPTY_EFFECTS: NonNullable<ArgPort["effects"]> = [];

type ResolvedPort = {
  port: ArgPort;
  Widget: ReturnType<WidgetRegistryType["getInputWidgetForPort"]>;
  path: string[];
  effects: NonNullable<ArgPort["effects"]>;
};

type ResolvedGroup = FilledGroup & { resolvedPorts: ResolvedPort[] };

/**
 * A port hidden through the `hidden` prop is a prefilled input, not an absent
 * one: it keeps its field registered so it is validated and submitted, it just
 * renders nothing.
 */
const HiddenPortField = ({ name }: { name: string }) => {
  useController({ name });
  return null;
};

const PortRow = React.memo(function PortRow({
  port,
  Widget,
  path,
  effects,
  registry,
  options,
  bound,
}: ResolvedPort & {
  registry: WidgetRegistryType;
  options?: PortOptions;
  bound?: string;
}) {
  // The cell sits inside the effects: a hidden port leaves no empty cell.
  return (
    <EffectWrapper effects={effects} port={port} path={path} registry={registry}>
      <div className={cn("relative", portSpanClass(portSize(port, port.widget)))}>
        <Widget
          port={port}
          bound={bound}
          widget={port.widget as unknown as AssignWidgetFragment}
          options={options}
          path={path}
        />
        <FollowValue followValue={port.widget?.followValue} path={path} />
      </div>
    </EffectWrapper>
  );
});

/**
 * `PortOptions` applied to everything below, without every widget having to
 * know: `disable` through a fieldset (it disables every control inside),
 * `labels: false` and `minimal` by hiding the form slots.
 */
const optionsClass = (options?: PortOptions) =>
  cn(
    "contents",
    // Hints small and quiet, close under their control (see PORT_HINT).
    "[&_[data-slot=form-description]]:text-[11px] [&_[data-slot=form-description]]:leading-snug [&_[data-slot=form-description]]:text-muted-foreground/70",
    "[&_[data-slot=form-item]]:content-start [&_[data-slot=form-item]]:gap-1.5",
    options?.labels === false && "[&_[data-slot=form-label]]:hidden",
    options?.minimal && "[&_[data-slot=form-description]]:hidden",
  );

export const ArgsContainer = ({
  ports,
  groups,
  options,
  registry,
  hidden,
  bound,
  path,
}: ArgsContainerProps) => {
  const hash = portHash(ports);
  const pathKey = path.join(".");

  // Resolve widgets, paths and effects once per port set. Doing this in the
  // render body handed every widget fresh `path` / `effects` arrays on each
  // render, which defeated memoization down the widget tree and re-triggered
  // search queries keyed on those props.
  const resolvedGroups = useMemo<ResolvedGroup[]>(() => {
    const presentPorts = ports.filter(notEmpty);
    const declaredGroups = (groups ?? []).filter(notEmpty);
    const grouped = new Set(declaredGroups.flatMap((g) => g.ports));
    // Ports the server left out of every group still exist (and are still
    // validated); render them in the default group instead of dropping them.
    const ungrouped = presentPorts.filter((p) => !grouped.has(p.key));
    const effectiveGroups: PortGroup[] = [
      ...declaredGroups,
      ...(ungrouped.length > 0
        ? [{ key: "default", ports: ungrouped.map((p) => p.key) }]
        : []),
    ];

    return effectiveGroups.map((g) => {
      const filledPorts = presentPorts.filter((x) => g.ports.includes(x?.key));
      return {
        ...g,
        filledPorts,
        resolvedPorts: filledPorts.map((port) => ({
          port,
          Widget: registry.getInputWidgetForPort(port),
          path: [...path, port.key],
          effects: port.effects || EMPTY_EFFECTS,
        })),
      };
    });
    // `hash` and `pathKey` stand in for the identity of `ports` / `path`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, groups, registry, pathKey]);

  const visibleGroups = useMemo(
    () =>
      resolvedGroups.map((group) => ({
        ...group,
        visible: group.resolvedPorts.filter((r) => !(hidden && hidden[r.port.key])),
        prefilled: group.resolvedPorts.filter((r) => hidden && hidden[r.port.key]),
      })),
    [resolvedGroups, hidden],
  );

  return (
    <PortsRootContext.Provider value={path}>
      <fieldset disabled={options?.disable} className={optionsClass(options)}>
        <div className="@container flex flex-col gap-5">
          {visibleGroups.map((group) => {
            const anchor = group.resolvedPorts[0];
            const body = (
              <Collapsible key={group.key} defaultOpen={true}>
                {group.prefilled.map((r) => (
                  <HiddenPortField key={r.port.key} name={pathToName(r.path)} />
                ))}
                {group.visible.length > 0 && group.key != "default" && (
                  <div className="mb-2">
                    <CollapsibleTrigger className="text-xs font-medium">
                      {group.title || group.key}
                    </CollapsibleTrigger>
                    {group.description && (
                      <p className="text-muted-foreground text-xs">{group.description}</p>
                    )}
                  </div>
                )}
                <CollapsibleContent>
                  <div className={options?.layout === "stack" ? PORT_STACK : PORT_GRID}>
                    {group.visible.map((resolved) => (
                      <PortRow
                        key={resolved.port.key}
                        {...resolved}
                        registry={registry}
                        options={options}
                        bound={bound}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
            // A group's own effects (hide the whole group) read their
            // dependencies as siblings of the group's ports.
            const effects = (group.effects ?? EMPTY_EFFECTS).filter(notEmpty);
            if (effects.length === 0 || !anchor) return body;
            return (
              <EffectWrapper
                key={group.key}
                effects={effects}
                port={anchor.port}
                path={anchor.path}
                registry={registry}
              >
                {body}
              </EffectWrapper>
            );
          })}
        </div>
      </fieldset>
    </PortsRootContext.Provider>
  );
};
