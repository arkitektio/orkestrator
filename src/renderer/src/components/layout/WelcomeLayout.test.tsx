// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WelcomeLayout } from "./WelcomeLayout";

const setElectron = (platform?: string) => {
  if (platform === undefined) {
    // @ts-expect-error - removing the injected global is the point
    delete window.electron;
    return;
  }
  // @ts-expect-error - stand in for @electron-toolkit's preload
  window.electron = { process: { platform } };
};

/** The preload's window bridge, which the Linux buttons need to render. */
const setWindowBridge = () => {
  // @ts-expect-error - stand in for the preload injection
  window.api = {
    windowControls: {
      minimize: vi.fn(),
      toggleMaximize: vi.fn(),
      close: vi.fn(),
      getState: vi.fn(async () => ({ maximized: false, fullscreen: false, focused: true })),
      onStateChanged: vi.fn(() => () => {}),
    },
  };
};

afterEach(() => {
  setElectron(undefined);
  // @ts-expect-error - clean up the injected global
  delete window.api;
  document.body.removeAttribute("data-command-hotkey");
});

describe("the signed-out window", () => {
  it("shows the welcome content and no rail", () => {
    render(
      <WelcomeLayout>
        <div>Welcome to Arkitekt</div>
      </WelcomeLayout>,
    );
    expect(screen.getByText("Welcome to Arkitekt")).toBeInTheDocument();
    expect(screen.queryByLabelText("Modules and pinned pages")).toBeNull();
  });

  it("still lets the window be dragged on the desktop", () => {
    // The rail is the drag region normally; without it the window would be
    // stuck wherever it opened.
    setElectron("darwin");
    render(<WelcomeLayout>x</WelcomeLayout>);
    expect(screen.getByTestId("welcome-drag-strip").className).toContain("app-drag");
  });

  it("draws its own window buttons where the platform has none", () => {
    setElectron("linux");
    setWindowBridge();
    render(<WelcomeLayout>x</WelcomeLayout>);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("has no drag region and no buttons in a browser tab", () => {
    render(<WelcomeLayout>x</WelcomeLayout>);
    expect(screen.getByTestId("welcome-drag-strip").className).not.toContain("app-drag");
    expect(screen.queryByLabelText("Close")).toBeNull();
  });

  it("switches the palette hotkeys off for the document while it is up", () => {
    const { unmount } = render(<WelcomeLayout>x</WelcomeLayout>);
    expect(document.body.getAttribute("data-command-hotkey")).toBe("off");
    unmount();
    expect(document.body.getAttribute("data-command-hotkey")).toBeNull();
  });
});
