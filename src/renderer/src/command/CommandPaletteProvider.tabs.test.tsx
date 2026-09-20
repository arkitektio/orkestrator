// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/constants", () => ({ baseName: "" }));

import { CommandPaletteProvider, useCommandContext, useCommandPalette } from "./CommandPaletteProvider";
import { ActiveTabRouter } from "./tabs/ActiveTabRouter";
import { TabOutlet } from "./tabs/TabOutlet";
import { TabsProvider, useTabActions, useTabList } from "./tabs/TabsProvider";

/** A page that offers one object to the palette, named after its path. */
const Page = ({ name }: { name: string }) => {
  useCommandContext({ objects: [{ identifier: "@x/thing", object: name }] });
  return <div>{name}</div>;
};

const routes = (
  <Routes>
    <Route path="/alpha" element={<Page name="alpha" />} />
    <Route path="/beta" element={<Page name="beta" />} />
    <Route path="*" element={<div>root</div>} />
  </Routes>
);

/** What the palette would show, and the levers to move between tabs. */
const Chrome = () => {
  const { pageContext } = useCommandPalette();
  const tabs = useTabList();
  const { open, focus } = useTabActions();
  return (
    <div>
      <span data-testid="context">
        {pageContext.objects?.map((o) => String(o.object)).join(",") ?? ""}
      </span>
      <button onClick={() => open("/alpha")}>open-alpha</button>
      <button onClick={() => open("/beta")}>open-beta</button>
      {tabs.map((t, i) => (
        <button key={t.id} onClick={() => focus(t.id)}>{`focus-${i}`}</button>
      ))}
    </div>
  );
};

const renderApp = () =>
  render(
    <TabsProvider>
      <ActiveTabRouter>
        <CommandPaletteProvider>
          <Chrome />
          <TabOutlet routes={routes} />
        </CommandPaletteProvider>
      </ActiveTabRouter>
    </TabsProvider>,
  );

const click = (label: string) => act(() => screen.getByText(label).click());
const context = () => screen.getByTestId("context").textContent;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

describe("the palette follows the active tab", () => {
  it("offers the active tab's page, not the last one that mounted", () => {
    renderApp();
    click("open-alpha");
    expect(context()).toBe("alpha");
    click("open-beta");
    expect(context()).toBe("beta");

    // Beta mounted last and is still mounted (warm, hidden). Alpha is what
    // the user is looking at.
    click("focus-1");
    expect(context()).toBe("alpha");
  });

  it("offers nothing on a tab whose page has no context", () => {
    renderApp();
    click("open-alpha");
    click("focus-0"); // the boot tab at "/"
    expect(context()).toBe("");
  });
});
