import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Constants } from "@/reaktion/base/Constants";
import { InStream } from "@/reaktion/base/Instream";
import { OutStream } from "@/reaktion/base/Outstream";
import { ReactiveNodeProps } from "@/reaktion/types";
import React from "react";
import { useFlowAdapter } from "./adapter";
import { contextMenuForImplementation, shapeForImplementation } from "./reactive/shapes";
import { statusClassName } from "./status";

const ReactiveWidgetInner: React.FC<ReactiveNodeProps> = ({ data, id }) => {
  const adapter = useFlowAdapter();
  const edit = adapter.useEditActions();
  const status = adapter.useNodeStatus(id);

  const Shape = shapeForImplementation(data.implementation);
  const Menu = contextMenuForImplementation(data.implementation);
  const shapeClass = statusClassName(status);

  const shape = <Shape implementation={data.implementation} data={data} id={id} className={shapeClass} />;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="group custom-drag-handle relative">
          {data.ins.map((s, index) => (
            <InStream key={index} stream={s} id={index} length={data.ins.length} />
          ))}
          {edit ? (
            <Popover>
              <PopoverTrigger asChild>
                <div>{shape}</div>
              </PopoverTrigger>
              <PopoverContent>
                {data.constants.length > 0 ? (
                  <Constants
                    ports={data.constants}
                    overwrites={data.constantsMap}
                    onSubmit={(values) => edit.updateData({ constantsMap: values }, id)}
                  />
                ) : (
                  "No configuration needed"
                )}
              </PopoverContent>
            </Popover>
          ) : (
            shape
          )}
          {data.outs.map((s, index) => (
            <OutStream key={index} stream={s} id={index} length={data.outs.length} />
          ))}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <Menu implementation={data.implementation} data={data} id={id} />
        {status && (
          <div className="text-xs text-muted-foreground p-1">
            Latest event: {status.kind}
          </div>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const ReactiveWidget = React.memo(ReactiveWidgetInner);
