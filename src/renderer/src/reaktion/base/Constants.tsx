import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { notEmpty } from "@/lib/utils";
import { FlussArgPortFragment } from "@/reaktion/api/graphql";
import { AssignWidgetFragment } from "@/rekuest/api/graphql";
import { usePortForm } from "@/rekuest/hooks/usePortForm";
import { EffectWrapper } from "@/rekuest/widgets/EffectWrapper";
import { ArgPort as RekuestArgPort } from "@/rekuest/widgets/types";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { portHash, submittedDataToRekuestFormat } from "@/rekuest/widgets/utils";
import { useLatestRef } from "@/hooks/useLatestRef";

import { ChevronUpIcon, DoubleArrowUpIcon } from "@radix-ui/react-icons";
import { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";

// The flow stores constants as fluss ArgPorts; the rekuest widget system renders
// rekuest ArgPorts. The two are structurally compatible for rendering (kind,
// children, choices, widget), so we bridge with a cast at the rekuest boundary.
const asRekuestPort = (port: FlussArgPortFragment): RekuestArgPort =>
  port as unknown as RekuestArgPort;

export { portHash };

let unserializableCounter = 0;

export const ArgsContainer = ({
  ports,
  options,
  bound,
  onToArg,
  onToGlobal,
  registry,
  path,
}: {
  ports: FlussArgPortFragment[];
  options?: import("@/rekuest/widgets/types").PortOptions;
  bound?: string;
  path: string[];
  registry: import("@/rekuest/widgets/types").WidgetRegistryType;
  onToArg?: (port: FlussArgPortFragment) => void;
  onToGlobal?: (port: FlussArgPortFragment, key?: string | undefined) => void;
}) => {
  return (
    <div className="grid @2xl:grid-cols-2 @5xl:grid-cols-2 gap-1">
      {ports.filter(notEmpty).map((port, index) => {
        const Widget = registry.getInputWidgetForPort(asRekuestPort(port));

        return (
          <EffectWrapper
            key={index}
            effects={asRekuestPort(port).effects || []}
            port={asRekuestPort(port)}
            path={path.concat(port.key)}
            registry={registry}
          >
            <div className="flex flex-row gap-2 justify-between w-full min-w-[200px]">
              <div className="flex-grow ">
                <Widget
                  key={index}
                  port={asRekuestPort(port)}
                  widget={port.widget as unknown as AssignWidgetFragment}
                  options={options}
                  path={path.concat(port.key)}
                  bound={bound}
                />
              </div>
              <div className="my-auto flex-col flex">
                {onToArg && (
                  <Button
                    variant="ghost"
                    className="py-1 px-1"
                    onClick={() => onToArg(port)}
                  >
                    <ChevronUpIcon />
                  </Button>
                )}
                {onToGlobal && (
                  <Button
                    variant="ghost"
                    className="py-1 px-1"
                    onClick={() => onToGlobal(port, undefined)}
                  >
                    <DoubleArrowUpIcon />
                  </Button>
                )}
              </div>
            </div>
          </EffectWrapper>
        );
      })}
    </div>
  );
};

export const Constants = (props: {
  ports: FlussArgPortFragment[];
  path?: string[];
  bound?: string | undefined;
  onSubmit?: (data: any) => void;
  onClick?: (onposition: number) => void;
  overwrites: { [key: string]: any };
  onToArg?: (port: FlussArgPortFragment) => void;
  onToGlobal?: (port: FlussArgPortFragment, key?: string | undefined) => void;
}) => {
  const form = usePortForm({
    ports: props.ports as unknown as RekuestArgPort[],
    overwrites: props.overwrites,
  });

  const onSubmit = (data: any) => {
    props.onSubmit?.(data);
  };

  // Push valid constants to the flow as the user edits: subscribe to the
  // values, key on their content, and validate+submit after a short pause.
  // (The previous `form.watch()` + `[formState, data]` effect fired on every
  // render and re-ran the full transform per keystroke.)
  const watched = useWatch({ control: form.control });
  const watchedKey = useMemo(() => {
    try {
      return JSON.stringify(watched);
    } catch {
      return `unserializable:${++unserializableCounter}`;
    }
  }, [watched]);
  const latest = useLatestRef({ form, ports: props.ports, onSubmit: props.onSubmit });

  useEffect(() => {
    const timer = setTimeout(() => {
      const { form: f, ports, onSubmit: submit } = latest.current;
      void f.trigger().then((valid) => {
        if (!valid) return;
        submit?.(
          submittedDataToRekuestFormat(
            f.getValues(),
            ports as unknown as RekuestArgPort[],
          ),
        );
      });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey]);

  const { registry } = useWidgetRegistry();

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-1 w-full"
        >
          <ArgsContainer
            registry={registry}
            ports={props.ports}
            onToArg={props.onToArg}
            onToGlobal={props.onToGlobal}
            path={props.path || []}
            bound={props.bound}
          />
        </form>
      </Form>
    </>
  );
};

export const TestConstants = (props: {
  ports: FlussArgPortFragment[];
  overwrites: { [key: string]: any };
  onToArg?: (port: FlussArgPortFragment) => void;
  onToGlobal?: (port: FlussArgPortFragment, key?: string | undefined) => void;
  onSubmit?: (data: any) => void;
}) => {
  const form = usePortForm({
    ports: props.ports as unknown as RekuestArgPort[],
    overwrites: props.overwrites,
  });

  function onSubmit(data: any) {
    if (props.onSubmit) {
      props.onSubmit(data);
    }
  }

  const {
    formState: { isValid, errors },
  } = form;

  const { registry } = useWidgetRegistry();

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <ArgsContainer
            registry={registry}
            ports={props.ports}
            onToArg={props.onToArg}
            onToGlobal={props.onToGlobal}
            path={[]}
          />
          {isValid && (
            <div>
              {props.onSubmit && (
                <button type="submit" className="btn">
                  {" "}
                  Submit{" "}
                </button>
              )}
            </div>
          )}
          {errors && <div>{JSON.stringify(errors)}</div>}
        </form>
      </Form>
    </>
  );
};
