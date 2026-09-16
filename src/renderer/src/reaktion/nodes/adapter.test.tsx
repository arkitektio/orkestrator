// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import type { RunEventFragment } from "@/reaktion/api/graphql";
import { NodeShowLayout } from "../base/NodeShow";
import { createEditFlowStore } from "../edit/store";
import { TrackRiverContext } from "../track/context";
import { linearGraph, makeNode } from "../validation/fixtures";
import { createEditAdapter, FlowAdapterProvider, showAdapter, trackAdapter, useFlowAdapter } from "./adapter";

const Layout = ({ id }: { id: string }) => (
  <ReactFlowProvider>
    <NodeShowLayout id={id} showResizeControl={false}>
      body
    </NodeShowLayout>
  </ReactFlowProvider>
);

describe("FlowAdapter", () => {
  it("NodeShowLayout shows validation errors only under the edit adapter", () => {
    const g = linearGraph();
    const store = createEditFlowStore({ ...g, nodes: [...g.nodes, makeNode("lonely")] });

    const edit = render(
      <FlowAdapterProvider adapter={createEditAdapter(store)}>
        <Layout id="lonely" />
      </FlowAdapterProvider>,
    );
    expect(screen.getByText(/Node with no ins and outs/)).toBeInTheDocument();
    edit.unmount();

    render(
      <FlowAdapterProvider adapter={showAdapter}>
        <Layout id="lonely" />
      </FlowAdapterProvider>,
    );
    expect(screen.queryByText(/Node with no ins and outs/)).toBeNull();
  });

  it("edit adapter exposes actions, the others expose none", () => {
    const Probe = () => {
      const edit = useFlowAdapter().useEditActions();
      return <div>{edit ? "editable" : "readonly"}</div>;
    };
    const store = createEditFlowStore(linearGraph());
    const a = render(
      <FlowAdapterProvider adapter={createEditAdapter(store)}>
        <Probe />
      </FlowAdapterProvider>,
    );
    expect(screen.getByText("editable")).toBeInTheDocument();
    a.unmount();
    render(
      <FlowAdapterProvider adapter={showAdapter}>
        <Probe />
      </FlowAdapterProvider>,
    );
    expect(screen.getByText("readonly")).toBeInTheDocument();
  });

  it("track adapter resolves a node's latest event from the run state map", () => {
    const Probe = () => {
      const status = useFlowAdapter().useNodeStatus("mid");
      return <div>{status?.kind ?? "none"}</div>;
    };
    const event = { id: "e", source: "mid", kind: "COMPLETE", t: 1 } as unknown as RunEventFragment;
    render(
      <TrackRiverContext.Provider
        value={{ setRunState: () => {}, runState: { t: 1, latestBySource: new Map([["mid", event]]) } }}
      >
        <FlowAdapterProvider adapter={trackAdapter}>
          <Probe />
        </FlowAdapterProvider>
      </TrackRiverContext.Provider>,
    );
    expect(screen.getByText("COMPLETE")).toBeInTheDocument();
  });
});
