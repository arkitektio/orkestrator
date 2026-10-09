// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent } from "@/core/ui/dialog";
import { DescribeStructuresDialog } from "./DescribeStructuresDialog";

describe("DescribeStructuresDialog", () => {
  it("lists every selected structure with its identity and descriptors", () => {
    // The provider renders it inside one shared `DialogContent`; so does this.
    render(
      <Dialog open>
        <DialogContent>
          <DescribeStructuresDialog
            left={[
              { identifier: "@mikro/lens", id: "42", label: "My lens", descriptors: { shape: [1, 2, 3] } },
              { identifier: "@kraph/graph", id: "7" },
            ]}
            right={[{ identifier: "@lok/user", id: "u1" }]}
          />
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText("Selected · 2")).toBeTruthy();
    expect(screen.getByText("Partner · 1")).toBeTruthy();
    expect(screen.getAllByText("@mikro/lens").length).toBeGreaterThan(0);
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getAllByText("My lens").length).toBe(2);
    expect(screen.getByText(/"shape"/)).toBeTruthy();
    // A structure without descriptors says so rather than printing "{}".
    expect(screen.getAllByText("none").length).toBe(2);
    expect(screen.getByText("Copy as JSON")).toBeTruthy();
  });
});
