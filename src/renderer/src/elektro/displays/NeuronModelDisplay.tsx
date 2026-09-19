import { DisplayWidgetProps } from "@/lib/display/registry";
import React from "react";
import { useDetailNeuronModelQuery } from "../api/graphql";

// The display registry is mounted at the app root, and this was the only path
// pulling three.js into the entry chunk — the renderer loads when a neuron
// model is actually displayed.
const EmbeddedMorphology = React.lazy(() =>
  import("../components/morphology/MorphologyScene").then((m) => ({
    default: m.MorphologyScene.Embedded,
  })),
);

export const NeuronModelDisplay = (props: DisplayWidgetProps) => {
  const { data } = useDetailNeuronModelQuery({
    variables: {
      id: props.object,
    },
  });

  const roi = data?.neuronModel;
  if (!roi) {
    return <div>ROI not found</div>;
  }
  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="mb-4 font-bold">{data.neuronModel.name}</div>
      <div className="flex-grow">
        <React.Suspense fallback={null}>
          <EmbeddedMorphology model={data.neuronModel} />
        </React.Suspense>
      </div>
    </div>
  );
};
