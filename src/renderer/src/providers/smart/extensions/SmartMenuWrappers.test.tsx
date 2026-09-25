// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { provideSmartRegistries } from "../hostRegistries";
import { SmartMenuWrappers } from "./SmartMenuWrappers";
import type { SmartMenuWrapperProps } from "./section";

const wrapper = (name: string) => {
  const Wrapper = ({ children, context }: SmartMenuWrapperProps) => (
    <div data-testid={name} data-objects={context.objects.length}>
      {children}
    </div>
  );
  return Wrapper as React.ComponentType<SmartMenuWrapperProps>;
};

afterEach(() => provideSmartRegistries({ menuWrappers: () => [] }));

describe("SmartMenuWrappers", () => {
  it("wraps the menu in every module's wrapper, the first outermost", () => {
    provideSmartRegistries({ menuWrappers: () => [wrapper("outer"), wrapper("inner")] });
    render(
      <SmartMenuWrappers context={{ objects: [{ identifier: "@x/y", id: "1" }] }}>
        <span data-testid="menu" />
      </SmartMenuWrappers>,
    );
    const outer = screen.getByTestId("outer");
    expect(outer.firstChild).toBe(screen.getByTestId("inner"));
    expect(screen.getByTestId("inner").firstChild).toBe(screen.getByTestId("menu"));
    expect(outer.dataset.objects).toBe("1");
  });

  it("renders the menu bare when no module wraps it", () => {
    render(
      <SmartMenuWrappers context={{ objects: [] }}>
        <span data-testid="menu" />
      </SmartMenuWrappers>,
    );
    expect(screen.getByTestId("menu")).toBeInTheDocument();
  });
});
