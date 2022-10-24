import {
  ArgPortFragment,
  InputWidgetFragment,
  ReturnPortFragment,
  ReturnWidgetFragment,
} from "../api/graphql";
import { WardRegistry } from "./registry";

export interface InputWidgetProps<
  W extends InputWidgetFragment = InputWidgetFragment
> {
  port: ArgPortFragment;
  widget?: W | null;
  ward_registry: WardRegistry;
  options?: PortOptions;
}

export type InputWidgetTypes = InputWidgetFragment["__typename"];
export type ReturnWidgetTypes = ReturnWidgetFragment["__typename"];

export interface ReturnWidgetProps<
  W extends ReturnWidgetFragment = ReturnWidgetFragment
> {
  port: ReturnPortFragment;
  widget?: W | null;
  ward_registry: WardRegistry;
  value?: any;
  className?: string;
}

export type RunQueryFunc<T extends any> = (options: {
  query: string;
  variables: any;
}) => Promise<T>;

export type PortOptions = {
  disable: boolean;
};

export interface Ward {
  search?:
    | RunQueryFunc<{
        options?: ({ label: string; value: any } | null | undefined)[];
      }>
    | undefined;
  resolveImage?: RunQueryFunc<string> | undefined;
  resolveStore?: RunQueryFunc<any> | undefined;
  hook: (
    hook: string | null | undefined
  ) => undefined | ((value: any) => React.ReactNode);
}
