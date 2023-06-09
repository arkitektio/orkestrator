import React from "react";
import { PortKind } from "../api/graphql";
import {
  InputWidgetProps,
  InputWidgetTypes,
  Port,
  ReturnWidgetProps,
  ReturnWidgetTypes,
  Ward,
} from "./types";

export const UnknownInputWidget: React.FC<InputWidgetProps> = ({ port }) => {
  return (
    <div className="text-xl bg-red-200">
      Registry error! No assign Widget registered for: {port.kind} and{" "}
      {port?.assignWidget?.__typename || "unset widget"}
    </div>
  );
};

export const UnknownReturnWidget: React.FC<ReturnWidgetProps> = ({
  port,
  value,
}) => {
  return (
    <div className="text-xl bg-red-200">
      Registry error! No assign Widget registered for: {port.kind} and{" "}
      {port?.returnWidget?.__typename || "unset widget"}
      {JSON.stringify(port)}
    </div>
  );
};

export class WardRegistry {
  ward_registry: { [ward_key: string]: Ward };

  constructor() {
    this.ward_registry = {};
  }

  public registerWard(ward_key: string, ward: Ward): void {
    this.ward_registry[ward_key] = ward;
  }

  public getWard(ward_key: string): Ward {
    return this.ward_registry[ward_key];
  }

  public printWards(): void {
    console.log("Wards", this.ward_registry);
  }
}

export type HookWidget = (props: { value: string }) => React.ReactNode;

export class HookRegistry {
  hook_registry: {
    [ward_key: string]: HookWidget;
  };

  constructor() {
    this.hook_registry = {};
  }

  public registerHook(hook_key: string, widget: HookWidget): void {
    this.hook_registry[hook_key] = widget;
  }

  public getHook(hook_key: string): HookWidget {
    return this.hook_registry[hook_key] || {};
  }
}

export class WidgetRegistry {
  portTypeInputFallbackMap: {
    [ward_key: string]: React.FC<InputWidgetProps>;
  };
  typeInputWidgetMap: {
    [widget_type: string]: React.FC<InputWidgetProps>;
  };
  portTypeReturnFallbackMap: {
    [ward_key: string]: React.FC<ReturnWidgetProps<any>>;
  };
  typeReturnWidgetMap: {
    [widget_type: string]: React.FC<ReturnWidgetProps<any>>;
  };
  ward_registry: WardRegistry;
  hook_registry: HookRegistry;

  constructor() {
    this.portTypeInputFallbackMap = {};
    this.typeInputWidgetMap = {};
    this.portTypeReturnFallbackMap = {};
    this.typeReturnWidgetMap = {};
    this.ward_registry = new WardRegistry();
    this.hook_registry = new HookRegistry();
  }

  public registerInputWidgetFallback(
    port_type: PortKind,
    widget: React.FC<InputWidgetProps>
  ): void {
    this.portTypeInputFallbackMap[port_type] = widget;
  }

  public registerWard(ward_key: string, ward: Ward): void {
    this.ward_registry.registerWard(ward_key, ward);
  }

  public registerInputWidget(
    widget_type: InputWidgetTypes,
    widget: React.FC<InputWidgetProps<any>>
  ): void {
    this.typeInputWidgetMap[widget_type || "Unkown"] = widget;
  }

  public getInputWidgetForPort(
    port: Port,
    allowFallback: boolean = true
  ): React.FC<InputWidgetProps> {
    if (!port?.assignWidget?.__typename) {
      return (
        (port?.kind &&
          allowFallback &&
          this.portTypeInputFallbackMap[port?.kind]) ||
        UnknownInputWidget
      );
    }

    return (
      this.typeInputWidgetMap[port?.assignWidget?.__typename] ||
      UnknownInputWidget
    );
  }

  public registerReturnWidgetFallback(
    port_type: PortKind,
    widget: React.FC<ReturnWidgetProps<any>>
  ): void {
    this.portTypeReturnFallbackMap[port_type] = widget;
  }

  public registerReturnWidget(
    widget_type: ReturnWidgetTypes,
    widget: React.FC<ReturnWidgetProps<any>>
  ): void {
    this.typeReturnWidgetMap[widget_type || "Unknown"] = widget;
  }

  public getReturnWidgetForPort(
    port: Port,
    allowFallback: boolean = true
  ): React.FC<ReturnWidgetProps<any>> {
    if (!port?.returnWidget?.__typename) {
      return (
        (port?.kind &&
          allowFallback &&
          this.portTypeReturnFallbackMap[port?.kind]) ||
        UnknownReturnWidget
      );
    }

    return (
      this.typeReturnWidgetMap[port?.returnWidget?.__typename] ||
      UnknownReturnWidget
    );
  }
}
