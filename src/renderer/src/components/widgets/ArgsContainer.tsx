import { AssignWidgetFragment } from "@/rekuest/api/graphql";
import { notEmpty } from "@/lib/utils";
import { EffectWrapper } from "@/rekuest/widgets/EffectWrapper";
import { PortsRootContext } from "@/rekuest/widgets/PortsRootContext";
import { ArgsContainerProps } from "@/rekuest/widgets/tailwind";
import { ArgPort, PortGroup, PortOptions, WidgetRegistryType } from "@/rekuest/widgets/types";
import { pathToName, portHash } from "@/rekuest/widgets/utils";
import React, { useMemo } from "react";
import { useController } from "react-hook-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { portGridClass } from "./gridColumns";

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
  return (
    <EffectWrapper effects={effects} port={port} path={path} registry={registry}>
      <Widget
        port={port}
        bound={bound}
        widget={port.widget as unknown as AssignWidgetFragment}
        options={options}
        path={path}
      />
    </EffectWrapper>
  );
});

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

  const groupCount = visibleGroups.filter((g) => g.visible.length > 0).length;

  return (
    <PortsRootContext.Provider value={path}>
      <div className={portGridClass(groupCount)}>
        {visibleGroups.map((group) => (
          <Collapsible key={group.key} className="@container" defaultOpen={true}>
            {group.prefilled.map((r) => (
              <HiddenPortField key={r.port.key} name={pathToName(r.path)} />
            ))}
            {group.visible.length > 0 && group.key != "default" && (
              <div className="mb-2">
                <CollapsibleTrigger className="text-xs">
                  {group.key}
                </CollapsibleTrigger>
                <p className="text-muted-foreground text-xs">
                  {group.description}
                </p>
              </div>
            )}
            <CollapsibleContent>
              <div className={portGridClass(group.visible.length)}>
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
        ))}
      </div>
    </PortsRootContext.Provider>
  );
};
