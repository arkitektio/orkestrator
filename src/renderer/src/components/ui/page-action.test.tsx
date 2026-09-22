// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionSlotModeProvider, PageAction } from "./page-action";
import type { ActionSlotMode } from "@/components/layout/actionPlan";

/** An action that hands its own element to the Button, as a link does. */
const LinkAction = ({ mode }: { mode: ActionSlotMode }) => (
  <ActionSlotModeProvider mode={mode}>
    <PageAction asChild icon={<span data-testid="icon" />} menuLabel="App Store">
      <a href="/kabinet/app-store">App Store</a>
    </PageAction>
  </ActionSlotModeProvider>
);

describe("PageAction with asChild", () => {
  it("renders the child as the button and keeps the icon beside its label", () => {
    render(<LinkAction mode="row" />);
    const link = screen.getByRole("link", { name: "App Store" });
    expect(link.getAttribute("data-slot")).toBe("button");
    expect(screen.getByTestId("icon").parentElement).toBe(link);
  });

  it("drops the words but keeps the link in the icon-only form", () => {
    render(<LinkAction mode="icon" />);
    const link = screen.getByRole("link", { name: "App Store" });
    expect(link.textContent).toBe("");
    expect(screen.getByTestId("icon").parentElement).toBe(link);
  });

  it("uses the menu label in the burger row", () => {
    render(<LinkAction mode="menu" />);
    expect(screen.getByRole("link").textContent).toBe("App Store");
  });
});
