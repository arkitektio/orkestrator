// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShieldOff } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { StatusPage, statusCopyText } from "./StatusPage";

describe("StatusPage", () => {
  it("shows the code as eyebrow and watermark, the hints and the details", () => {
    render(
      <StatusPage
        code={403}
        tone="warning"
        icon={ShieldOff}
        title="You can't access this dataset"
        description="Either it doesn't exist, or you may not see it."
        hints={[<>Switch organization.</>]}
        details={[{ label: "Page", value: "/mikro/datasets/9", mono: true }]}
        technical="Not found, or you are not authorized to access it."
      />,
    );
    expect(screen.getByRole("heading", { name: "You can't access this dataset" })).toBeInTheDocument();
    expect(screen.getByText("Error 403")).toBeInTheDocument();
    expect(screen.getByText("403")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("What you can try")).toBeInTheDocument();
    expect(screen.getByText("/mikro/datasets/9")).toBeInTheDocument();
    expect(screen.getByText("Technical details")).toBeInTheDocument();
  });

  it("draws no cards and no numeral when it has nothing to put in them", () => {
    render(<StatusPage icon={ShieldOff} eyebrow="Unreachable" title="Couldn't reach Mikro" />);
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
    expect(screen.queryByText("What you can try")).toBeNull();
    expect(screen.queryByText("Details")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("copies the page as text: title, each detail, the technical payload", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(
      <StatusPage
        icon={ShieldOff}
        title="Access denied"
        details={[{ label: "Signed in as", value: "johannes" }]}
        technical="raw"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Copy details" }));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("Access denied");
    expect(copied).toContain("Signed in as: johannes");
    expect(copied).toContain("raw");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("does not pretend an element is text when copying", () => {
    expect(statusCopyText({ title: <b>x</b>, details: [{ label: "Role", value: <i>admin</i> }] })).toContain(
      "Role: [element]",
    );
  });

  it("is an inline alert when compact", () => {
    render(<StatusPage variant="compact" icon={ShieldOff} title="No access" code={403} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No access");
    expect(screen.queryByText("403")).toBeNull();
  });

  it("announces itself as busy only when told it is working", () => {
    const { rerender } = render(<StatusPage icon={ShieldOff} title="Connecting" busy />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    rerender(<StatusPage icon={ShieldOff} title="Denied" />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
