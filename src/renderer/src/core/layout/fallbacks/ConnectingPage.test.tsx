// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/connection/ui/doctor/ConnectionDoctor", () => ({
  ConnectionDoctorSheet: () => <button>Diagnose connection</button>,
}));

const { ConnectingPage, CONNECTING_REVEAL_MS, CONNECTING_SLOW_MS } = await import("./ConnectingPage");
const { resetConnectionProgress, sessionStep, setMeshProgress, startSession } = await import(
  "@/core/connection/progress/store"
);

beforeEach(() => {
  vi.useFakeTimers();
  resetConnectionProgress();
  startSession("booting", "refresh", { deployment: "Lab", endpointUrl: "https://go.example.org/lok/f/" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ConnectingPage", () => {
  it("shows only the backdrop on a fast launch", () => {
    render(<ConnectingPage />);
    expect(screen.queryByText("Signing in to Lab")).toBeNull();
  });

  it("lists the steps once it takes a moment, and follows them", () => {
    render(<ConnectingPage />);
    act(() => vi.advanceTimersByTime(CONNECTING_REVEAL_MS));
    expect(screen.getByText("Signing in to Lab").closest("li")?.dataset.state).toBe("working");
    expect(screen.getByText("Opening Lab").closest("li")?.dataset.state).toBe("pending");

    act(() => sessionStep("open"));
    expect(screen.getByText("Signing in to Lab").closest("li")?.dataset.state).toBe("done");
    expect(screen.getByText("Opening Lab").closest("li")?.dataset.state).toBe("working");
  });

  it("shows the mesh while it is being brought up for this session", () => {
    render(<ConnectingPage />);
    act(() => {
      vi.advanceTimersByTime(CONNECTING_REVEAL_MS);
      setMeshProgress({ meshId: "lab", label: "Lab", phase: "needs-machine-auth", since: 0, demandedBy: ["self"] });
    });
    expect(screen.getByText("Waiting for an administrator to approve this computer on the mesh")).toBeTruthy();
  });

  it("says when it is taking longer than usual, with the doctor", () => {
    render(<ConnectingPage />);
    act(() => vi.advanceTimersByTime(CONNECTING_SLOW_MS));
    expect(screen.getByText("This is taking longer than usual.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Diagnose connection" })).toBeTruthy();
  });
});
