import {
  AssignWidgetFragment,
  PortEffectFragment,
  ArgPortFragment,
  PortGroupFragment,
  PortKind,
  ReturnWidgetFragment,
  ReturnPortFragment
} from "../api/graphql";



export type ArgPort = ArgPortFragment;
export type ReturnPort = ReturnPortFragment;

// A port whose widget can be resolved by the registry — either an input (ArgPort)
// or an output (ReturnPort).
export type MappablePort = ArgPort | ReturnPort;

// Back-compat alias: forms/dialogs that edit input values operate on ArgPorts.
export type Port = ArgPort;

export interface InputWidgetProps<
  W extends AssignWidgetFragment = AssignWidgetFragment,
> {
  port: ArgPort;
  widget: W;
  options?: PortOptions;
  parentKind?: PortKind;
  path: string[];
  bound?: string;
}

export type Returns =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: Returns }
  | Returns[];



export type InputWidgetTypes = AssignWidgetFragment["__typename"];
export type ReturnWidgetTypes = ReturnWidgetFragment["__typename"];
export type PortEffectTypes = PortEffectFragment["__typename"];

export type ValueKind = string | number | boolean | null | undefined | { [key: string]: ValueKind } | ValueKind[];



export interface ReturnWidgetProps<
  W extends ReturnWidgetFragment = ReturnWidgetFragment,
  V extends ValueKind = ValueKind,
> {
  port: ReturnPort;
  widget?: W | null;
  value?: V;
  options?: PortOptions;
  revision?: string | number | null;
}

export type EffectWidgetProps = {
  children: React.ReactNode;
  effect: PortEffectFragment;
  port: MappablePort;
  /** react-hook-form path of the port's field (e.g. `["args", "mode"]`). */
  path: string[];
};

export type Effect = PortEffectFragment;

export type PortGroup = PortGroupFragment;

export type RunQueryFunc<T extends {[key: string]: unknown}> = (options: {
  query: string;
  variables: T;
}) => Promise<T>;

export type PortOptions = {
  disable?: boolean;
  bound?: string | null;
  minimal?: boolean;
  labels?: boolean;
};

export interface Ward {
  search: (options: {
    query: string;
    variables:  {[key: string]: unknown};
  }) => Promise<({ label: string; value: any } | null | undefined)[]>;
  describe?: (options: {
    identifier: string;
    id: string;
  }) => Promise<{ key: string, value: string }[]>;
}

export type LabellablePort = {
  key: string;
  label?: string | null;
  kind: PortKind;
  identifier?: string | null;
  nullable?: boolean;
  // Loosely typed: the deepest port-fragment children omit some fields (e.g. key),
  // so this stays structural to accept both arg/return fragments at any depth.
  children?: readonly any[] | null;
  choices?: ArgPort["choices"];
};

export type PortablePort = LabellablePort & {
  key: string;
  default?: any | null | undefined;
  validators?: ArgPort["validators"];
};










export interface WidgetRegistryType {
  registerWard: (ward_key: string, ward: Ward) => () => void;
  getWard: (ward_key: string) => Ward;
  registerInputWidget: (
    widget_type: InputWidgetTypes,
    widget: React.FC<InputWidgetProps<any>>,
  ) => () => void;
  registerInputWidgetFallback: (
    port_type: PortKind,
    widget: React.FC<InputWidgetProps>,
  ) => () => void;
  registerReturnWidget: (
    widget_type: ReturnWidgetTypes,
    widget: React.FC<ReturnWidgetProps<any>>,
  ) => () => void;
  registerEffectWidget: (
    effect_type: PortEffectTypes,
    widget: React.FC<EffectWidgetProps>,
  ) => () => void;
  registerReturnWidgetFallback: (
    port_type: PortKind,
    widget: React.FC<ReturnWidgetProps<any>>,
  ) => () => void;
  getReturnWidgetForPort: (
    port: MappablePort,
    allowFallback?: boolean,
  ) => React.FC<ReturnWidgetProps<any>>;
  getInputWidgetForPort: (
    port: MappablePort,
    allowFallback?: boolean,
  ) => React.FC<InputWidgetProps>;
  getEffectWidget: (effect: PortEffectTypes) => React.FC<EffectWidgetProps>;
}
