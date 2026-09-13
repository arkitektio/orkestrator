import { portGridClass } from "@/components/widgets/gridColumns";
import { cn } from "@/lib/utils";
import PortConstraintBadges from "../components/displays/PortConstraintBadges";
import { EffectWrapper } from "./EffectWrapper";
import { ArgPort, ReturnPort, PortGroup , PortOptions, WidgetRegistryType } from "./types";

export type ArgsContainerProps = {
  registry: WidgetRegistryType;
  ports: (ArgPort | null | undefined)[];
  groups?: (PortGroup | null | undefined)[] | undefined;
  options?: PortOptions | undefined;
  bound?: string; // Are we bound to a specific AGENT if so the id of the agent
  path: string[];
  hidden?: { [key: string]: boolean };
};

export type InputContainer = (props: ArgsContainerProps) => React.ReactNode;

export type ReturnContainerProps = {
  registry: WidgetRegistryType;
  ports: ReturnPort[];
  values: { [key: string]: any | null | undefined };
  options?: PortOptions | undefined;
  showKeys?: boolean;
  className?: string;
};

export type OutputContainer = (props: ReturnContainerProps) => React.ReactNode;

export const ReturnsContainer =  ({
  ports,
  values,
  registry,
  showKeys = false,
  className,
}: ReturnContainerProps) => {
  return (
    <div className={cn(portGridClass(ports.length), className)}>
      {Object.keys(values).map((key, index) => {
        const port = ports.find((p) => p.key === key);
        if (!port) return <>No Port</>;

        const Widget = registry.getReturnWidgetForPort(port);

        return (
          <div className="@container flex flex-col rounded-md border" key={index}>
            {showKeys && (
              <label
                className="flex-initial font-light mb-2"
                htmlFor={port.key}
              >
                {port.label || port.key}
              </label>
            )}
            <div className="flex-grow bg-background rounded-md">
              <EffectWrapper
                effects={port.effects || []}
                port={port}
                path={[port.key]}
                registry={registry}
              >
                <Widget
                  key={index}
                  port={port}
                  widget={port.widget}
                  value={values[key]}
                />
              </EffectWrapper>
            </div>
            {port.description && (
              <div
                id={`${port.key}-help`}
                className="text-xs mb-4 font-light flex-initial text-muted-foreground"
              >
                {port.description}
              </div>
            )}
            <PortConstraintBadges items={port.provides} className="mt-1" />
          </div>
        );
      })}
    </div>
  );
};

export const WrappedReturnsContainer = ({
  ports,
  values,
  registry,
  showKeys = false,
  className,
}: ReturnContainerProps) => {
  return (
    <div className={cn("flex flex-row flex-wrap gap-2 w-full h-full", className)}>
      {Object.keys(values).map((key, index) => {
        const port = ports.find((p) => p.key === key);
        if (!port) return <>No Port</>;

        const Widget = registry.getReturnWidgetForPort(port);

        return (
          <div
            key={key}
            className="@container flex flex-col rounded-md border flex-1"
          >
            {showKeys && (
              <label
                className="flex-initial font-light mb-2"
                htmlFor={port.key}
              >
                {port.label || port.key}
              </label>
            )}
            <div className="flex-grow bg-muted rounded-md max-h-[300px]">
              <EffectWrapper
                effects={port.effects || []}
                port={port}
                path={[port.key]}
                registry={registry}
              >
                <Widget
                  key={index}
                  port={port}
                  widget={port.widget}
                  value={values[key]}
                />
              </EffectWrapper>
            </div>
            {port.description && (
              <div
                id={`${port.key}-help`}
                className="text-xs mb-4 font-light flex-initial text-muted-foreground"
              >
                {port.description}
              </div>
            )}
            <PortConstraintBadges items={port.provides} className="mt-1" />
          </div>
        );
      })}
    </div>
  );
};
