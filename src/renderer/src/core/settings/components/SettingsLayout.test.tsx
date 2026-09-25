// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Spring-loaded drop targets need the DnD runtime; the nav only needs links.
vi.mock("@/core/lib/dnd/react", () => ({
  useSpringLoaded: () => ({ ref: () => undefined, isOver: false }),
}));

import { SETTINGS_SECTIONS } from "../sections";
import { SettingsLayout } from "./SettingsLayout";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<SettingsLayout />}>
          <Route path="/settings/:slug" element={<div data-testid="page" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("SettingsLayout", () => {
  it("links to every section and shows the page beside them", () => {
    renderAt("/settings/general");
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const section of SETTINGS_SECTIONS) {
      expect(hrefs).toContain(`/settings/${section.slug}`);
    }
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });

  it("marks the open section", () => {
    renderAt("/settings/appearance");
    const active = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current"));
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAttribute("href", "/settings/appearance");
  });
});
