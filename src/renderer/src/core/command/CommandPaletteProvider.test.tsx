// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CommandPaletteProvider,
  useCommandContext,
  useCommandPalette,
} from "./CommandPaletteProvider";

const press = (key: string, init: KeyboardEventInit = {}) => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, metaKey: true, bubbles: true, ...init }),
    );
  });
};

/** Shows what the provider currently holds, so assertions read as behaviour. */
const Probe = () => {
  const { open, query, intent, pageContext } = useCommandPalette();
  return (
    <div>
      <span data-testid="open">{String(open)}</span>
      <span data-testid="query">{query}</span>
      <span data-testid="intent">{intent}</span>
      <span data-testid="returns">{(pageContext.returns ?? []).join(",")}</span>
    </div>
  );
};

/** Stands in for a page contributing its context, as the layouts now do. */
const Page = ({ returns }: { returns: string[] }) => {
  useCommandContext({ returns });
  return null;
};

const renderWith = (children?: React.ReactNode) =>
  render(
    <CommandPaletteProvider>
      <Probe />
      {children}
    </CommandPaletteProvider>,
  );

const isOpen = () => screen.getByTestId("open").textContent === "true";

describe("the single hotkey listener", () => {
  it("opens once with two pages contributing context", () => {
    // The regression this provider exists to fix: the palette used to be
    // mounted per page, each mount installing its own capture-phase listener,
    // so two pages on screen meant two toggles — i.e. it opened and instantly
    // closed again.
    renderWith(
      <>
        <Page returns={["@mikro/image"]} />
        <Page returns={["@mikro/folder"]} />
      </>,
    );

    expect(isOpen()).toBe(false);
    press("k");
    expect(isOpen()).toBe(true);
  });

  it("keeps the older shortcuts working", () => {
    // Muscle memory for existing users, and free to retain.
    renderWith();
    press("m");
    expect(isOpen()).toBe(true);
    press("m");
    expect(isOpen()).toBe(false);
    press(",");
    expect(isOpen()).toBe(true);
  });

  it("ignores a held key", () => {
    // Without the guard, holding the shortcut strobes the palette.
    renderWith();
    press("k");
    expect(isOpen()).toBe(true);
    press("k", { repeat: true });
    expect(isOpen()).toBe(true);
  });

  it("ignores a plain keypress with no modifier", () => {
    renderWith();
    press("k", { metaKey: false });
    expect(isOpen()).toBe(false);
  });

  it("leaves editors that own their own chords alone", () => {
    render(
      <CommandPaletteProvider>
        <Probe />
        <div data-command-hotkey="off">
          <input data-testid="editor" />
        </div>
      </CommandPaletteProvider>,
    );

    const editor = screen.getByTestId("editor");
    act(() => {
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
      );
    });

    expect(isOpen()).toBe(false);
  });
});

describe("page contributions", () => {
  it("hands the palette the innermost mounted page's context", () => {
    // A model page rendered inside a list page is the more specific context,
    // and it is the one mounted later.
    renderWith(
      <>
        <Page returns={["outer"]} />
        <Page returns={["inner"]} />
      </>,
    );
    expect(screen.getByTestId("returns").textContent).toBe("inner");
  });

  it("falls back to the outer page when the inner one unmounts", () => {
    const { rerender } = render(
      <CommandPaletteProvider>
        <Probe />
        <Page returns={["outer"]} />
        <Page returns={["inner"]} />
      </CommandPaletteProvider>,
    );
    expect(screen.getByTestId("returns").textContent).toBe("inner");

    rerender(
      <CommandPaletteProvider>
        <Probe />
        <Page returns={["outer"]} />
      </CommandPaletteProvider>,
    );
    expect(screen.getByTestId("returns").textContent).toBe("outer");
  });

  it("leaves no context behind when every page unmounts", () => {
    const { rerender } = render(
      <CommandPaletteProvider>
        <Probe />
        <Page returns={["outer"]} />
      </CommandPaletteProvider>,
    );
    expect(screen.getByTestId("returns").textContent).toBe("outer");

    rerender(
      <CommandPaletteProvider>
        <Probe />
      </CommandPaletteProvider>,
    );
    expect(screen.getByTestId("returns").textContent).toBe("");
  });
});

describe("opening fresh", () => {
  it("clears a stale query so ⌘K never resumes someone else's search", () => {
    const Typer = () => {
      const { setQuery } = useCommandPalette();
      return (
        <button type="button" onClick={() => setQuery("leftover")}>
          type
        </button>
      );
    };

    renderWith(<Typer />);
    act(() => screen.getByText("type").click());
    expect(screen.getByTestId("query").textContent).toBe("leftover");

    press("k");
    expect(screen.getByTestId("query").textContent).toBe("");
  });
});

describe("⌘T is not the palette's", () => {
  it("leaves ⌘T alone — the tab store opens a real tab on it", () => {
    renderWith();
    press("t");
    expect(isOpen()).toBe(false);
  });

  it("still opens with ⌘K, meaning plain navigation", () => {
    renderWith();
    press("k");
    expect(isOpen()).toBe(true);
    expect(screen.getByTestId("intent").textContent).toBe("navigate");
  });
});
