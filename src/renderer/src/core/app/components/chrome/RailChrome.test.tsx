// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveTabRouter } from "@/core/command/tabs/ActiveTabRouter";
import { TabsProvider } from "@/core/command/tabs/TabsProvider";
import { useActiveTabNavigation } from "@/core/command/tabs/useActiveTabNavigation";

import { RailChrome } from "./RailChrome";

// The nav row reads the active tab's history for Back/Forward, so the bar
// needs the tab store and the chrome router beneath it.
// The share button stamps the link with the connection it was copied from, so
// the bar also needs an active profile to read that scope out of.
const { profileRef } = vi.hoisted(() => ({
  profileRef: { current: null as unknown },
}));
vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: {
    useActiveProfileId: () => "org-a",
    useActiveProfile: () => profileRef.current,
  },
}));

const CONNECTED = {
  identity: {
    baseUrl: "https://go.arkitekt.live",
    userId: "u1",
    organizationId: "acme",
  },
  label: {},
};
vi.mock("@/core/constants", () => ({ baseName: "" }));

const Shell = ({ children }: { children: React.ReactNode }) => (
  <TabsProvider>
    <ActiveTabRouter>{children}</ActiveTabRouter>
  </TabsProvider>
);

/** Drives the active tab's history from a test. */
const Driver = () => {
  const { navigate } = useActiveTabNavigation();
  return <button onClick={() => navigate("/somewhere")}>drive-forward</button>;
};

vi.mock("./TitleSearchBar", () => ({
  TitleSearchBar: () => (
    <button type="button" className="app-no-drag">
      search
    </button>
  ),
}));

const setElectron = (platform?: string) => {
  if (platform === undefined) {
    // @ts-expect-error - removing the injected global is the point
    delete window.electron;
    return;
  }
  // @ts-expect-error - stand in for the preload injection
  window.electron = { process: { platform } };
};

const setWindowState = (state: Partial<{ maximized: boolean; fullscreen: boolean }> = {}) => {
  // @ts-expect-error - stand in for the preload injection
  window.api = {
    windowControls: {
      minimize: vi.fn(),
      toggleMaximize: vi.fn(),
      close: vi.fn(),
      getState: vi.fn(async () => ({
        maximized: false,
        fullscreen: false,
        focused: true,
        ...state,
      })),
      onStateChanged: vi.fn(() => () => {}),
      popupAppMenu: vi.fn(),
    },
  };
};

beforeEach(() => {
  setWindowState();
  localStorage.clear();
  window.location.hash = "";
});
afterEach(() => {
  setElectron(undefined);
  // @ts-expect-error - clean up the injected global
  delete window.api;
  vi.restoreAllMocks();
});

/** Is this element, or any ancestor within the zone, opted out of dragging? */
const isClickable = (el: Element, root: Element): boolean => {
  let node: Element | null = el;
  while (node && node !== root.parentElement) {
    if (node.classList.contains("app-no-drag")) return true;
    node = node.parentElement;
  }
  return false;
};

describe("RailChrome drag regions", () => {
  // With no title bar, this zone is the ONLY way to move the window — which
  // makes the `app-no-drag` on its one control load-bearing rather than
  // defensive. A drag region swallows clicks silently: no error, the button
  // just never fires.
  it.each(["darwin", "win32", "linux"])(
    "drags the window while leaving its controls clickable on %s",
    (platform) => {
      setElectron(platform);
      const { container } = render(<Shell><RailChrome /></Shell>);

      const zone = container.querySelector(".app-drag");
      expect(zone, "the rail's chrome zone must be draggable").not.toBeNull();

      const interactive = zone!.querySelectorAll("button, input, a, [role='button']");
      expect(interactive.length).toBeGreaterThan(0);
      interactive.forEach((el) => {
        expect(
          isClickable(el, zone!),
          `${el.textContent} sits in a drag region with no app-no-drag, so it cannot be clicked`,
        ).toBe(true);
      });
    },
  );

  it("still offers the search pill in a browser, where there is nothing to drag", () => {
    setElectron(undefined);
    const { container } = render(<Shell><RailChrome /></Shell>);
    expect(screen.getByText("search")).toBeInTheDocument();
    expect(container.querySelector(".app-drag")).toBeNull();
  });
});

describe("double-clicking the bar", () => {
  it("maximises on Linux, whose frameless window lost that along with its frame", () => {
    setElectron("linux");
    const { container } = render(<Shell><RailChrome /></Shell>);
    fireEvent.doubleClick(container.querySelector(".app-drag")!);
    expect(window.api.windowControls.toggleMaximize).toHaveBeenCalledTimes(1);
  });

  it("does not double up on a control on Linux", () => {
    setElectron("linux");
    render(<Shell><RailChrome /></Shell>);
    fireEvent.doubleClick(screen.getByLabelText("Reload"));
    expect(window.api.windowControls.toggleMaximize).not.toHaveBeenCalled();
  });

  it.each(["darwin", "win32"])("is left to the real frame on %s", (platform) => {
    setElectron(platform);
    const { container } = render(<Shell><RailChrome /></Shell>);
    fireEvent.doubleClick(container.querySelector(".app-drag")!);
    expect(window.api.windowControls.toggleMaximize).not.toHaveBeenCalled();
  });
});

describe("the traffic-light gutter", () => {
  it("reserves room beside the lights on macOS, where they sit on the rail", () => {
    // The nav buttons share this row with the lights, so the gutter is
    // horizontal: without it they would be drawn underneath them.
    setElectron("darwin");
    render(<Shell><RailChrome /></Shell>);
    expect(screen.getByTestId("traffic-light-gutter").style.width).toBe("78px");
  });

  it("reserves none off macOS, where there are no lights to avoid", () => {
    setElectron("win32");
    render(<Shell><RailChrome /></Shell>);
    expect(screen.queryByTestId("traffic-light-gutter")).not.toBeInTheDocument();
  });

  // The fullscreen collapse itself is pinned on the pure function in
  // `lib/platform.test.ts`; asserting it here would only prove that jsdom
  // resolves an async getState, which is not the behaviour worth pinning.
});

describe("navigation controls", () => {
  it("offers back, forward and reload above the search", () => {
    setElectron("darwin");
    render(<Shell><RailChrome /></Shell>);
    expect(screen.getByLabelText("Back")).toBeInTheDocument();
    expect(screen.getByLabelText("Forward")).toBeInTheDocument();
    expect(screen.getByLabelText("Reload")).toBeInTheDocument();
  });
});

describe("the application menu", () => {
  // Windows lost its caption and Linux its frame, so neither shows a menu bar;
  // the "…" button is the only way left to File / Edit / View / Window.
  it.each(["win32", "linux"])("pops the native menu up under the button on %s", (platform) => {
    setElectron(platform);
    render(<Shell><RailChrome /></Shell>);
    fireEvent.click(screen.getByLabelText("Application menu"));
    expect(window.api.windowControls.popupAppMenu).toHaveBeenCalledTimes(1);
  });

  it.each([["darwin"], [undefined]])("is not offered on %s, which keeps a menu bar or has none", (platform) => {
    setElectron(platform);
    render(<Shell><RailChrome /></Shell>);
    expect(screen.queryByLabelText("Application menu")).not.toBeInTheDocument();
  });
});

describe("overflow", () => {
  const original = window.ResizeObserver;
  afterEach(() => {
    window.ResizeObserver = original;
  });

  /** A ResizeObserver that reports the given width for whatever it observes. */
  const observeAs = (width: number) => {
    window.ResizeObserver = class {
      private cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(target: Element) {
        this.cb([{ target, contentRect: { width } } as ResizeObserverEntry], this as never);
      }
      unobserve() {}
      disconnect() {}
    };
  };

  it("folds the rightmost buttons into a “…” menu when the row is too narrow", async () => {
    // Three slots: Back and Forward inline, Reload and Share behind the menu.
    observeAs(3 * 24 + 2 * 2);
    setElectron("darwin");
    render(<Shell><RailChrome /></Shell>);

    expect(screen.getByLabelText("Back")).toBeInTheDocument();
    expect(screen.getByLabelText("Forward")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reload")).toBeNull();
    expect(screen.queryByLabelText("Share")).toBeNull();

    const more = screen.getByLabelText("More");
    expect(more).toHaveClass("app-no-drag");
    // Open with the keyboard: Radix opens its menu on Enter, which jsdom can
    // deliver where a real pointer sequence cannot.
    await act(async () => {
      fireEvent.keyDown(more, { key: "Enter" });
    });
    expect(await screen.findByRole("menuitem", { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /copy a link/i })).toBeInTheDocument();
  });

  it("shows everything again once there is room", () => {
    observeAs(400);
    setElectron("darwin");
    render(<Shell><RailChrome /></Shell>);
    expect(screen.getByLabelText("Share")).toBeInTheDocument();
    expect(screen.queryByLabelText("More")).toBeNull();
  });
});

describe("window controls", () => {
  it.each(["darwin", "win32"])("draws none of its own on %s", (platform) => {
    // macOS has real traffic lights; on Windows they live in the bar that
    // slides down from the top edge (`AutoHideTitleBar`), not in the rail.
    setElectron(platform);
    render(<Shell><RailChrome /></Shell>);
    expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
  });

  it("puts them inline with the nav controls on Linux", () => {
    // The one genuinely frameless platform, and with no title bar there is no
    // top-right corner to put them in.
    setElectron("linux");
    render(<Shell><RailChrome /></Shell>);
    expect(screen.getByLabelText("Minimize")).toBeInTheDocument();
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("draws none in a browser", () => {
    setElectron(undefined);
    render(<Shell><RailChrome /></Shell>);
    expect(screen.queryByLabelText("Close")).not.toBeInTheDocument();
  });
});

describe("Back and Forward are greyed honestly", () => {
  // A HashRouter never exposed depth, so these could never be disabled; each
  // tab's memory history knows exactly where it stands.
  it("disables both on a fresh tab", () => {
    setElectron("darwin");
    render(<Shell><RailChrome /></Shell>);
    expect(screen.getByLabelText("Back")).toBeDisabled();
    expect(screen.getByLabelText("Forward")).toBeDisabled();
  });

  it("enables Back after navigating, and Forward after going back", () => {
    setElectron("darwin");
    render(
      <Shell>
        <RailChrome />
        <Driver />
      </Shell>,
    );
    act(() => screen.getByText("drive-forward").click());
    expect(screen.getByLabelText("Back")).toBeEnabled();
    expect(screen.getByLabelText("Forward")).toBeDisabled();

    act(() => screen.getByLabelText("Back").click());
    expect(screen.getByLabelText("Back")).toBeDisabled();
    expect(screen.getByLabelText("Forward")).toBeEnabled();
  });
});

describe("share", () => {
  beforeEach(() => {
    profileRef.current = CONNECTED;
  });

  const original = navigator.clipboard;
  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: original, configurable: true });
  });

  it("copies the active tab's universal link", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(
      <Shell>
        <Driver />
        <RailChrome />
      </Shell>,
    );
    act(() => screen.getByText("drive-forward").click());
    await act(async () => {
      screen.getByLabelText("Share").click();
    });
    // Scoped: the same path on another deployment is a different object, so
    // the link names the one it was copied from.
    expect(writeText).toHaveBeenCalledWith(
      "https://arkitekt.live/deeplink?orkestrator=" +
        "%2Fopen%3Fto%3Dhttps%253A%252F%252Fgo.arkitekt.live%26org%3Dacme%26path%3D%252Fsomewhere",
    );
    // It says so, for a moment.
    expect(screen.getByLabelText("Share").getAttribute("title")).toBe("Link copied");
  });

  it("falls back to a portable link when nothing is connected", async () => {
    profileRef.current = null;
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(
      <Shell>
        <Driver />
        <RailChrome />
      </Shell>,
    );
    act(() => screen.getByText("drive-forward").click());
    await act(async () => {
      screen.getByLabelText("Share").click();
    });
    // There is no scope to promise, so none is claimed.
    expect(writeText).toHaveBeenCalledWith(
      `https://arkitekt.live/deeplink?orkestrator=${encodeURIComponent("/somewhere")}`,
    );
  });

  it("copies the same link as a README badge on right-click", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(
      <Shell>
        <Driver />
        <RailChrome />
      </Shell>,
    );
    act(() => screen.getByText("drive-forward").click());
    act(() => {
      fireEvent.contextMenu(screen.getByLabelText("Share"));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /copy as badge/i }));
    });
    expect(writeText).toHaveBeenCalledWith(
      "[![Open in Arkitekt](https://arkitekt.live/img/badge/open-in-arkitekt.svg)]" +
        `(https://arkitekt.live/deeplink?orkestrator=${encodeURIComponent("/somewhere")})`,
    );
  });
});

