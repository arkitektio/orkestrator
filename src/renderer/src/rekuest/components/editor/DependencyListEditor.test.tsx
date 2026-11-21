// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyDependency, type DependencyDraft } from "./blokDependencies";
import { DependencyListEditor } from "./DependencyListEditor";

const port = (key: string, nullable = false) => ({ key, kind: "FLOAT", label: key, nullable });

vi.mock("@/rekuest/api/graphql", () => ({
  useAgentsQuery: () => ({ data: { agents: [{ id: "7", name: "Stage one", connected: true, app: { identifier: "live.stage" } }] }, loading: false }),
  useAgentForProtocolQuery: ({ skip }: { skip?: boolean }) => ({
    data: skip
      ? undefined
      : {
          agent: {
            id: "7",
            name: "Stage one",
            app: { identifier: "live.stage" },
            states: [{ id: "s", interface: "position", updatedAt: "", definition: { hash: "h", name: "Position", ports: [port("x")] } }],
            implementations: [
              { interface: "move", action: { key: "m", name: "Move", description: "Go there", args: [port("x")], returns: [] } },
              { interface: "home", action: { key: "h", name: "Home", description: null, args: [], returns: [] } },
            ],
          },
        },
  }),
}));

const stage = (): DependencyDraft => ({
  ...emptyDependency("stage"),
  app: "live.stage",
  actions: [{ key: "move", description: "", optional: false, demand: null }],
});

describe("DependencyListEditor", () => {
  it("offers what the app's agent has, and declares it on a click", () => {
    const onChange = vi.fn();
    render(
      <DependencyListEditor
        dependencies={[stage()]}
        problems={new Map()}
        source="<Button onClick={agents.stage.move(x: 1)} /><Button onClick={agents.stage.home()} />"
        onChange={onChange}
      />,
    );
    // Declared and used; `home` is called by the source but not declared.
    expect(screen.getByTitle("Used in the source")).toBeTruthy();
    expect(screen.getByText("Named in the source, not declared")).toBeTruthy();
    fireEvent.click(screen.getByTitle("Declare home"));
    const next = onChange.mock.calls[0][0] as DependencyDraft[];
    expect(next[0].actions.map((action) => action.key)).toEqual(["move", "home"]);

    // A state is picked the same way, with what the agent says of it.
    fireEvent.click(screen.getByTitle("Declare position"));
    const withState = onChange.mock.calls[1][0] as DependencyDraft[];
    expect(withState[0].states).toEqual([
      { key: "position", description: "", optional: false, demand: { matches: [{ key: "x", kind: "FLOAT" }] } },
    ]);
  });

  it("offers to declare an agent the source names", () => {
    const onChange = vi.fn();
    render(
      <DependencyListEditor dependencies={[stage()]} problems={new Map()} source="<Text text={agents.lamp.light.on} />" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "lamp" }));
    const next = onChange.mock.calls[0][0] as DependencyDraft[];
    expect(next.map((draft) => draft.key)).toEqual(["stage", "lamp"]);
  });

  it("says which agent a key is bound to where the preview runs live", () => {
    render(
      <DependencyListEditor
        dependencies={[stage(), emptyDependency("lamp")]}
        problems={new Map()}
        bound={new Map([["stage", { id: "7", name: "Stage one", connected: true }]])}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Stage one")).toBeTruthy();
    expect(screen.getByText("not bound here")).toBeTruthy();
  });
});
