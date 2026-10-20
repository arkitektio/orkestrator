// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const decide = vi.fn(() => Promise.resolve({}));

vi.mock("@/rekuest/api/graphql", () => ({
  useDecideMutation: () => [decide, { loading: false }],
}));
// What displays an action is a module's business; here it shows its fallback.
vi.mock("@/core/smart/display/StructureDisplay", () => ({
  StructureDisplay: ({ fallback }: { fallback: React.ReactNode }) => <>{fallback}</>,
}));

import { HoldCard } from "./HoldCard";

const hold = {
  task: "c7",
  kind: "assign" as const,
  title: "Delegate to Segmenter",
  description: "It counts nuclei.",
  action: { id: "a1", name: "Segmenter" },
  agent: { id: "ag2", name: "segmenter-app" },
  callerAgent: { id: "ag1", name: "blok-assistant" },
  args: { sigma: 2 },
};

describe("HoldCard", () => {
  it("shows the agent's words apart from what the server knows", () => {
    render(<HoldCard hold={hold} />);
    expect(screen.getByText("blok-assistant says")).toBeTruthy();
    expect(screen.getByText("Delegate to Segmenter")).toBeTruthy();
    expect(screen.getByText("Segmenter")).toBeTruthy();
    expect(screen.getByText("segmenter-app")).toBeTruthy();
    expect(screen.getByText('{"sigma":2}')).toBeTruthy();
  });

  it("decides the held task, with the note when one was written", () => {
    render(<HoldCard hold={hold} />);
    fireEvent.click(screen.getByText("Approve"));
    expect(decide).toHaveBeenLastCalledWith({ variables: { input: { task: "c7", approved: true, answer: null } } });

    fireEvent.click(screen.getByText("Add a note"));
    fireEvent.change(screen.getByPlaceholderText(/Anything to tell it/), { target: { value: " use plate 2 " } });
    fireEvent.click(screen.getByText("Deny"));
    expect(decide).toHaveBeenLastCalledWith({
      variables: { input: { task: "c7", approved: false, answer: "use plate 2" } },
    });
  });
});
