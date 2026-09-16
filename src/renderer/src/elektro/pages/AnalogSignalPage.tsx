import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import { ElektroAnalogSignal, ElektroAnalogSignalChannel } from "@/linkers";
import { cn } from "@/lib/utils";
import React from "react";
import { useDetailAnalogSignalQuery } from "../api/graphql";
import {
  AnalogSignalRender,
  channelToLabel
} from "../components/AnalogSignalRender";


export const AnalogSignalPage = asDetailQueryRoute(
  useDetailAnalogSignalQuery,
  ({ data }) => {
    const [hidden, setHidden] = React.useState<string[]>([]);

    return (
      <ElektroAnalogSignal.ModelPage
        variant="black"
        title={data?.analogSignal?.name || "Analog Signal"}
        object={data?.analogSignal}
        pageActions={
          <div className="flex flex-row gap-2">
            <ElektroAnalogSignal.ObjectButton object={data.analogSignal} />
          </div>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <ElektroAnalogSignal.Knowledge object={data.analogSignal} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="flex h-full w-full flex flex-col gap-2">
          <div className="flex-initial grid grid-cols-12 gap-2">
            <div className="col-span-11 h-32 p-3">
              <div>
                <h1 className="scroll-m-16 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  {data.analogSignal.name}
                </h1>
                <p className="mt-3 text-xl text-muted-foreground">
                  {data.analogSignal.id} · {data.analogSignal.unit}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-grow w-full gap-2 flex">
            <AnalogSignalRender signal={data.analogSignal} hidden={hidden} />
          </div>
          <div className="flex-initial flex flex-row gap-2 mb-6">
            {data.analogSignal.channels.map((view, index) => (
              <Card
                className={cn(
                  "px-2 flex-1 cursor-pointer max-w-xs p-3",
                  hidden.includes(view.id) && "opacity-20",
                )}
                key={index}
                onClick={() => {
                  setHidden((prev) =>
                    prev.find((x) => x === view.id)
                      ? prev.filter((x) => x !== view.id)
                      : [...prev, view.id],
                  );
                }}
              >
                <div className="flex flex-row gap-2 my-auto">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: channelToLabel(view) }}
                  />
                  <div className="text-sm text-muted-foreground my-auto truncate">
                    {channelToLabel(view)} {view.name}
                  </div>
                  <ElektroAnalogSignalChannel.DetailLink
                    object={view}
                    className="text-sm text-muted-foreground my-auto truncate"
                  >
                    Open
                  </ElektroAnalogSignalChannel.DetailLink>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </ElektroAnalogSignal.ModelPage>
    );
  },
);


export default AnalogSignalPage;
