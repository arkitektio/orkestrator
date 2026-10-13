// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/rekuest/api/graphql", () => ({ PortKind: { Structure: "STRUCTURE" } }));

const hosted = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));
vi.mock("./CatalogWidget", () => ({
  CatalogWidget: (props: Record<string, unknown> & { fallback: React.ReactNode }) => {
    hosted.props = props;
    return <div>{props.fallback}</div>;
  },
}));

const Search = () => <span>the search widget</span>;
const IdBox = () => <span>the id box</span>;
const lookup = vi.fn((port: { widget?: unknown }) => (port.widget ? Search : IdBox));
vi.mock("@/core/ports/engine/WidgetsContext", () => ({
  useWidgetRegistry: () => ({ registry: { getInputWidgetForPort: lookup } }),
}));

import type { InputWidgetProps } from "@/core/ports/engine/types";
import { StructurePickerWidget } from "./StructurePickerWidget";

afterEach(cleanup);

const QUERY = "query S($search: String, $values: [ID!], $path: ID) { options: lenses(filters: {search: $search, ids: $values, reachableFrom: $path}) { value: id label } }";

const port = (widget?: Record<string, unknown>) =>
  ({ key: "lens", kind: "STRUCTURE", identifier: "@mikro/arraylens", widget }) as unknown as InputWidgetProps["port"];

describe("a structure port drawn by the catalog's picker", () => {
  it("hands a search widget's query, ward and dependencies to the picker", () => {
    const widget = { __typename: "SearchAssignWidget", query: QUERY, ward: "mikro", dependencies: ["path"] };
    render(<StructurePickerWidget port={port(widget)} widget={widget as never} path={["lens"]} />);

    expect(hosted.props).toMatchObject({
      component: "StructurePicker",
      componentProps: [
        { key: "bind", static_value: "value" },
        { key: "query", static_value: QUERY },
        { key: "ward", static_value: "mikro" },
      ],
      dependencies: ["path"],
    });
  });

  it("gives a port with no widget the picker with no query, so the owning module answers", () => {
    render(<StructurePickerWidget port={port()} widget={null as never} path={["lens"]} />);

    expect(hosted.props).toMatchObject({ componentProps: [{ key: "bind", static_value: "value" }] });
    expect(hosted.props?.dependencies).toBeUndefined();
  });

  it("falls back to what the port would have got without the picker", () => {
    const widget = { __typename: "SearchAssignWidget", query: QUERY, ward: "mikro", dependencies: [] };
    render(<StructurePickerWidget port={port(widget)} widget={widget as never} path={["lens"]} />);
    expect(screen.getByText("the search widget")).toBeInTheDocument();
    expect(lookup).toHaveBeenLastCalledWith(expect.anything(), true, false);

    cleanup();
    render(<StructurePickerWidget port={port()} widget={null as never} path={["lens"]} />);
    expect(screen.getByText("the id box")).toBeInTheDocument();
  });
});
