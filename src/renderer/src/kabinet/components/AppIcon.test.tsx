// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useMarkImage = vi.fn();
vi.mock("@/core/lib/marks/useMarkImage", () => ({
  useMarkImage: (input: unknown) => useMarkImage(input),
}));
import { AppIcon } from "./AppIcon";

const app = {
  name: "Napari Viewer",
  identifier: "org.example.napari-viewer",
  hue: 210,
  logo: null as string | null,
  embedding: null as string | null,
};

const MARK = "data:image/png;base64,MARK";

/**
 * `AppIcon` has three tiers, and which one shows is the whole point: a real
 * logo always wins, the generated mark replaces the initials that used to be
 * every logo-less app's icon, and the initials survive as the no-WebGL floor.
 */
describe("AppIcon", () => {
  it("shows a real logo and never renders a mark for it", () => {
    useMarkImage.mockReturnValue({ src: null, pending: false });
    render(<AppIcon app={{ ...app, logo: "https://example.com/logo.png" }} />);

    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "https://example.com/logo.png",
    );
    // Passing null is what skips the render entirely — an app with a logo must
    // not occupy a slot in the offscreen queue.
    expect(useMarkImage).toHaveBeenCalledWith(null);
  });

  it("falls back to the mark when a logo URL fails to load", () => {
    useMarkImage.mockReturnValue({ src: MARK, pending: false });
    render(<AppIcon app={{ ...app, logo: "https://example.com/broken.png" }} />);

    fireEvent.error(screen.getByRole("presentation", { hidden: true }));
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute("src", MARK);
  });

  it("shows the mark when there is no logo", () => {
    useMarkImage.mockReturnValue({ src: MARK, pending: false });
    const { container } = render(<AppIcon app={app} />);

    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute("src", MARK);
    // The initials stay mounted underneath — a grid's marks arrive over several
    // frames, so the tile cross-fades rather than popping icon by icon — but
    // they are faded out once the mark is there.
    expect(container.querySelector("[style*='linear-gradient']")).toHaveClass("opacity-0");
  });

  it("asks for the mark at the size it will be drawn", () => {
    useMarkImage.mockReturnValue({ src: MARK, pending: false });
    render(<AppIcon app={app} size={96} />);

    expect(useMarkImage).toHaveBeenCalledWith({
      name: app.name,
      identifier: app.identifier,
      embedding: null,
      size: 96,
    });
  });

  it("passes the app's embedding through, so the mark can be semantic", () => {
    useMarkImage.mockReturnValue({ src: MARK, pending: false });
    render(<AppIcon app={{ ...app, embedding: "potion-base-8M:0.1,0.2" }} />);

    expect(useMarkImage).toHaveBeenCalledWith(
      expect.objectContaining({ embedding: "potion-base-8M:0.1,0.2" }),
    );
  });

  it("keeps the initials for a machine with no WebGL", () => {
    useMarkImage.mockReturnValue({ src: null, pending: false });
    const { container } = render(<AppIcon app={app} />);

    expect(screen.getByText("NV")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    // ...and the hue gradient behind them, which the mark does not need.
    expect(container.querySelector("[style*='linear-gradient']")).toBeInTheDocument();
  });
});
