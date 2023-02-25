import {
  PortFragment,
  InputWidgetFragment,
  ReturnWidgetFragment,
} from "../api/graphql";
import { WardRegistry } from "./registry";

export interface InputWidgetProps<
  W extends InputWidgetFragment = InputWidgetFragment
> {
  port: PortFragment;
  widget?: W | null;
  options?: PortOptions;
}

export type Port = Pick<
  PortFragment,
  "identifier" | "kind" | "nullable" | "child" | "returnWidget" | "assignWidget"
>;

export type InputWidgetTypes = InputWidgetFragment["__typename"];
export type ReturnWidgetTypes = ReturnWidgetFragment["__typename"];

export interface ReturnWidgetProps<
  W extends ReturnWidgetFragment = ReturnWidgetFragment
> {
  port: Port;
  widget?: W | null;
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
