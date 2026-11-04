// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoIcon, PlayIcon } from "lucide-react";

import { FloatMenu, type FloatMenuEntry } from "./FloatMenu";

const entries = (extra: Partial<Record<string, Partial<FloatMenuEntry>>> = {}): FloatMenuEntry[] => [
  { id: "run", label: "Run", icon: PlayIcon, hint: "on this shape", content: ({ typed }) => <p>run pane {typed ?? ""}</p>, ...extra.run },
  { id: "details", label: "Details", icon: InfoIcon, content: () => <p>details pane</p>, ...extra.details },
];

const Menu = ({ list }: { list: FloatMenuEntry[] }) => {
  const [pane, setPane] = useState<string | null>(null);
  return <FloatMenu entries={list} pane={pane} onPaneChange={setPane} typeTo="run" summary="a path" />;
};

afterEach(cleanup);

describe("FloatMenu", () => {
  it("is a short list of rows at its root, with what each holds", () => {
    render(<Menu list={entries()} />);
    expect(screen.getByText("a path")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Run/ }).textContent).toContain("on this shape");
    expect(screen.getByRole("button", { name: /Details/ })).toBeTruthy();
    expect(screen.queryByText("run pane")).toBeNull();
  });

  it("leaves a hidden entry out", () => {
    render(<Menu list={entries({ details: { hidden: true } })} />);
    expect(screen.queryByRole("button", { name: /Details/ })).toBeNull();
  });

  it("slides a row's pane in, and goes back by the back button and by Escape", async () => {
    render(<Menu list={entries()} />);
    fireEvent.click(screen.getByRole("button", { name: /Details/ }));
    expect(await screen.findByText("details pane")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("button", { name: /Details/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Details/ }));
    const pane = await screen.findByText("details pane");
    fireEvent.keyDown(pane, { key: "Escape" });
    expect(await screen.findByRole("button", { name: /Run/ })).toBeTruthy();
  });

  it("opens the type-to pane with the first character typed on the root", async () => {
    render(<Menu list={entries()} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /Run/ }), { key: "c" });
    expect(await screen.findByText("run pane c")).toBeTruthy();
  });
});
