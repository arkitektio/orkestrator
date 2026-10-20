// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const decide = vi.fn(() => Promise.resolve({}));
const detailAction = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("@/rekuest/api/graphql", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/rekuest/api/graphql")>()),
  useDecideMutation: () => [decide, { loading: false }],
  useDetailActionQuery: () => ({ data: detailAction.current }),
}));
// What displays a structure is a module's business; here it says what it would show.
vi.mock("@/core/smart/display/StructureDisplay", () => ({
  StructureDisplay: ({ identifier, id }: { identifier: string; id: string }) => <span>{`${identifier}:${id}`}</span>,
}));
vi.mock("@/rekuest/components/logo/ActionLogo", () => ({ ActionLogo: () => <span data-testid="logo" /> }));

import { PortKind } from "@/rekuest/api/graphql";
import { HoldCard, HoldDecisionLine } from "./HoldCard";

const hold = {
  task: "c7",
  kind: "assign" as const,
  title: "Delegate to Segmenter",
  description: "It counts nuclei.",
  action: { id: "a1", name: "Segmenter" },
  agent: { id: "ag2", name: "segmenter-app" },
  callerAgent: { id: "ag1", name: "blok-assistant" },
  args: { image: { __identifier: "@mikro/image", object: "31" }, sigma: 2, release: "5" },
};

describe("HoldCard", () => {
  it("shows the agent's words apart from what the server knows", () => {
    detailAction.current = undefined;
    render(<HoldCard hold={hold} />);
    expect(screen.getByText("Delegate to Segmenter")).toBeTruthy();
    expect(screen.getByText("It counts nuclei.")).toBeTruthy();
    expect(screen.getByText("blok-assistant")).toBeTruthy();
    expect(screen.getByText("asks to run")).toBeTruthy();
    expect(screen.getByText("segmenter-app")).toBeTruthy();
    expect(screen.getByText("Waiting for you")).toBeTruthy();
  });

  it("shows arguments as what they are: a wired structure as itself, the rest as values", () => {
    detailAction.current = undefined;
    render(<HoldCard hold={hold} />);
    expect(screen.getByText("@mikro/image:31")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    // Without the action's ports, a bare id is just its value.
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("labels arguments by the action's ports, and shows a bare id a port calls a structure as one", () => {
    detailAction.current = {
      action: {
        name: "Segment nuclei",
        logo: { id: "b1", hash: "h" },
        args: [
          { key: "release", label: "Release", kind: PortKind.Structure, identifier: "@kabinet/release" },
          { key: "sigma", label: "Smoothing", kind: PortKind.Float },
        ],
      },
    };
    render(<HoldCard hold={hold} />);
    expect(screen.getByText("Release")).toBeTruthy();
    expect(screen.getByText("@kabinet/release:5")).toBeTruthy();
    expect(screen.getByText("Smoothing")).toBeTruthy();
    expect(screen.getByText("Segment nuclei")).toBeTruthy();
    expect(screen.getByTestId("logo")).toBeTruthy();
  });

  it("decides the held task, with the note when one was written", () => {
    detailAction.current = undefined;
    const { unmount } = render(<HoldCard hold={hold} />);
    fireEvent.click(screen.getByText("Approve"));
    expect(decide).toHaveBeenLastCalledWith({ variables: { input: { task: "c7", approved: true, answer: null } } });
    unmount();

    render(<HoldCard hold={hold} />);
    fireEvent.click(screen.getByText("Add a note"));
    fireEvent.change(screen.getByPlaceholderText(/Anything to tell it/), { target: { value: " use plate 2 " } });
    fireEvent.click(screen.getByText("Deny"));
    expect(decide).toHaveBeenLastCalledWith({
      variables: { input: { task: "c7", approved: false, answer: "use plate 2" } },
    });
  });
});

describe("HoldDecisionLine", () => {
  it("says how it was answered", () => {
    const { rerender } = render(
      <HoldDecisionLine hold={hold} decision={{ task: "c7", approved: false, auto: false, answer: "not now" }} />,
    );
    expect(screen.getByText(/You declined/)).toBeTruthy();
    expect(screen.getByText(/not now/)).toBeTruthy();

    rerender(<HoldDecisionLine hold={hold} decision={{ task: "c7", approved: true, auto: true }} />);
    expect(screen.getByText(/Ran without asking/)).toBeTruthy();
  });
});
