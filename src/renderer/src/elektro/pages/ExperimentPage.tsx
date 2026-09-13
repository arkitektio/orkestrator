import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Card } from "@/components/ui/card";
import {
  ElektroExperiment,
  ElektroRecording,
  ElektroStimulus,
} from "@/linkers";
import { cn } from "@/lib/utils";
import React from "react";
import Timestamp from "@/components/ui/timestamp";
import { useSearchParams } from "react-router-dom";
import { useDetailExperimentQuery } from "../api/graphql";
import {
  getColorForRecordingView,
  getColorForStimulusView,
  recordingViewToLabel,
  stimulusViewToLabel,
} from "../components/ExperimentRender.utils";
import {
  ExperimentRender,
} from "../components/ExperimentRender";

type RangeSelection = {
  left: number | null;
  right: number | null;
};

const DEFAULT_RANGE: RangeSelection = { left: 0, right: null };

const parseBrushRange = (rawBrushRange: string | null): RangeSelection => {
  if (!rawBrushRange) {
    return DEFAULT_RANGE;
  }

  const [rawLeft, rawRight] = rawBrushRange.split(":");
  const left = Number.parseInt(rawLeft, 10);
  const right = Number.parseInt(rawRight, 10);

  if (Number.isNaN(left) || Number.isNaN(right) || right <= left) {
    return DEFAULT_RANGE;
  }

  return {
    left: Math.max(0, left),
    right,
  };
};

const encodeBrushRange = (range: RangeSelection) => {
  if (range.right == null || range.right <= (range.left ?? 0)) {
    return null;
  }

  return `${range.left ?? 0}:${range.right}`;
};

export const ExperimentPage = asDetailQueryRoute(
  useDetailExperimentQuery,
  ({ data, subscribeToMore: _subscribeToMore }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [hidden, setHidden] = React.useState<string[]>([]);
    const [hiddenStimuli, setHiddenStimuli] = React.useState<string[]>([]);
    const selectedRange = React.useMemo(
      () => parseBrushRange(searchParams.get("brush")),
      [searchParams],
    );

    const setSelectedRange = React.useCallback(
      (range: RangeSelection) => {
        const encodedRange = encodeBrushRange(range);
        const currentRange = searchParams.get("brush");

        if ((encodedRange ?? null) === currentRange) {
          return;
        }

        const nextParams = new URLSearchParams(searchParams);

        if (encodedRange) {
          nextParams.set("brush", encodedRange);
        } else {
          nextParams.delete("brush");
        }

        setSearchParams(nextParams, { replace: true });
      },
      [searchParams, setSearchParams],
    );

    return (
      <ElektroExperiment.ModelPage
        variant="black"
        title={data?.experiment?.name}
        object={data?.experiment}
        pageActions={
          <div className="flex flex-row gap-2">
            <ElektroExperiment.ObjectButton object={data.experiment} />
          </div>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <ElektroExperiment.Knowledge object={data.experiment} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="flex-initial grid grid-cols-12 gap-2 h-32 w-full">
          <div className="col-span-11 h-32 p-3">
            <div>
              <h1 className="scroll-m-16 text-4xl font-extrabold tracking-tight lg:text-5xl">
                {data.experiment.name}
              </h1>
              <p className="mt-3 text-xl text-muted-foreground">
                {data.experiment.description} <Timestamp date={new Date(data.experiment.createdAt)} autoUpdate />
              </p>
            </div>
          </div>
        </div>
        <div className="flex-grow w-full flex overflow-hidden">
          <ExperimentRender
            experiment={data.experiment}
            hidden={hidden}
            hiddenStimuli={hiddenStimuli}
            selectedRange={selectedRange}
            onSelectedRangeChange={setSelectedRange}
          />
        </div>
        <div className="flex-initial flex flex-row gap-2 mb-6">
          {data.experiment.recordingViews.map((view, index) => (
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
                  style={{ backgroundColor: getColorForRecordingView(view) }}
                />
                <div className="text-sm text-muted-foreground my-auto truncate">
                  {recordingViewToLabel(view)}
                </div>
                <ElektroRecording.DetailLink
                  object={view.recording}
                  className="text-sm text-muted-foreground my-auto truncate"
                >
                  Open
                </ElektroRecording.DetailLink>
              </div>
            </Card>
          ))}
          {data.experiment.stimulusViews.map((view, index) => (
            <Card
              className={cn(
                "px-2 flex-1 cursor-pointer max-w-xs p-3",
                hiddenStimuli.includes(view.id) && "opacity-20",
              )}
              key={index}
              onClick={() => {
                setHiddenStimuli((prev) =>
                  prev.find((x) => x === view.id)
                    ? prev.filter((x) => x !== view.id)
                    : [...prev, view.id],
                );
              }}
            >
              <div className="flex flex-row gap-2 my-auto">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getColorForStimulusView(view) }}
                />
                <div className="text-sm text-muted-foreground my-auto">
                  {stimulusViewToLabel(view)}
                </div>
                <ElektroStimulus.DetailLink
                  object={view.stimulus}
                  className="text-sm text-muted-foreground my-auto truncate"
                >
                  Open
                </ElektroStimulus.DetailLink>
              </div>
            </Card>
          ))}
        </div>
      </ElektroExperiment.ModelPage>
    );
  },
);


export default ExperimentPage;
