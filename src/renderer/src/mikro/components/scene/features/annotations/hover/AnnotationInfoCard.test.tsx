// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const infoQuery = vi.fn();
vi.mock("@/mikro/api/graphql", () => ({
  useGetAnnotationInfoQuery: (options: unknown) => infoQuery(options),
}));
vi.mock("@/core/linkers", () => {
  const link = (kind: string) => ({
    DetailLink: ({ object, children }: { object: { id: string }; children: ReactNode }) => (
      <a href={`/${kind}/${object.id}`}>{children}</a>
    ),
  });
  return {
    MikroLens: link("lens"),
    MikroArrayDataset: link("arraydataset"),
    MikroTableDataset: link("tabledataset"),
    MikroSparseDataset: link("sparsedataset"),
    MikroMeshCollection: link("meshcollection"),
  };
});
vi.mock("@/core/layout/fallbacks/StatusPage", () => ({
  StatusPage: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));
vi.mock("@/core/layout/fallbacks/statusActions", () => ({ RetryButton: () => null }));

import { AnnotationInfoCard } from "./AnnotationInfoCard";

const annotation = {
  id: "ann:1",
  kind: "RECTANGLE",
  description: null,
  creator: { sub: "7" },
  collection: { id: "col:1", name: "Somata" },
  coordinates: [{ name: "c", value: 1 }],
  derivedLenses: [],
  derivedResidents: [],
};

afterEach(cleanup);

describe("AnnotationInfoCard", () => {
  it("asks for the shape when it mounts, fresh each time", () => {
    infoQuery.mockReturnValue({ data: undefined });
    const { container } = render(<AnnotationInfoCard id="ann:1" />);

    expect(infoQuery).toHaveBeenCalledWith({ variables: { id: "ann:1" }, fetchPolicy: "cache-and-network" });
    expect(container.querySelector("[aria-busy]")).not.toBeNull();
  });

  it("says where it sits, and that nothing was made from it", () => {
    infoQuery.mockReturnValue({ data: { annotation } });
    render(<AnnotationInfoCard id="ann:1" />);

    // The author is the card's header's, not a row here.
    expect(screen.queryByText("Drawn by")).toBeNull();
    // The collection says nothing the scene does not already show.
    expect(screen.queryByText("Somata")).toBeNull();
    expect(screen.getByText("c 1")).toBeTruthy();
    expect(screen.getByText("Nothing has been cut or computed from this shape yet.")).toBeTruthy();
    expect(screen.queryByText("Cut to this shape")).toBeNull();
    expect(screen.queryByText("Computed from this shape")).toBeNull();
  });

  it("lists the lenses cut to it and the data computed from it, each linked to its page", () => {
    infoQuery.mockReturnValue({
      data: {
        annotation: {
          ...annotation,
          creator: null,
          derivedLenses: [{ __typename: "ArrayLens", id: "12", label: "cells.zarr · y[1:5], x[2:7]", shape: [4, 5] }],
          derivedResidents: [
            { __typename: "ArrayDataset", id: "40", name: "Straightened" },
            { __typename: "TableDataset", id: "41", name: "Measurements" },
            { __typename: "NetworkCollection", id: "42", label: "Skeleton" },
            // A part of a container is never a derivation's child; one that
            // arrives anyway has nothing to show.
            { __typename: "ArrayLens" },
          ],
        },
      },
    });
    render(<AnnotationInfoCard id="ann:1" />);

    expect(screen.getByText("cells.zarr · y[1:5], x[2:7]").getAttribute("href")).toBe("/lens/12");
    expect(screen.getByText("4 × 5")).toBeTruthy();
    expect(screen.getByText("Straightened").getAttribute("href")).toBe("/arraydataset/40");
    expect(screen.getByText("Measurements").getAttribute("href")).toBe("/tabledataset/41");
    // No page of its own: named, not linked.
    expect(screen.getByText("Skeleton").tagName).toBe("SPAN");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByText("Nothing has been cut or computed from this shape yet.")).toBeNull();
  });

  it("a failed read says so; a failed refresh keeps what it had", () => {
    infoQuery.mockReturnValue({ data: undefined, error: new Error("boom"), refetch: vi.fn() });
    const { unmount } = render(<AnnotationInfoCard id="ann:1" />);
    expect(screen.getByRole("alert").textContent).toBe("Could not read this annotation");
    unmount();

    infoQuery.mockReturnValue({ data: { annotation }, error: new Error("boom"), refetch: vi.fn() });
    render(<AnnotationInfoCard id="ann:1" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("c 1")).toBeTruthy();
  });
});
