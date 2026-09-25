// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { ModuleLoadingFallback } from "./ModuleLoading";

describe("ModuleLoadingFallback", () => {
  it("is what a suspended lazy route shows — a loader, not the sign-in screen", () => {
    const Never = React.lazy(() => new Promise<never>(() => undefined));
    render(
      <React.Suspense fallback={<ModuleLoadingFallback />}>
        <Never />
      </React.Suspense>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText(/authenticate/i)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
