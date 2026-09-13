import { ReactNode } from "react";
import { PortEffectFragment } from "../api/graphql";
import { MappablePort, WidgetRegistryType } from "./types";

export const EffectWrapper = ({
  effects,
  registry,
  children,
  port,
  path,
}: {
  registry: WidgetRegistryType;
  effects: readonly (PortEffectFragment | null | undefined)[];
  children: ReactNode;
  port: MappablePort;
  /** react-hook-form path of the port's field. */
  path: string[];
}) => {
  const [effect, ...resteffect] = effects;

  if (effect) {
    const Wrapper = registry.getEffectWidget(effect.__typename);

    return (
      <Wrapper effect={effect} port={port} path={path}>
        <EffectWrapper effects={resteffect} port={port} path={path} registry={registry}>
          {children}
        </EffectWrapper>
      </Wrapper>
    );
  }

  return <>{children}</>;
};
