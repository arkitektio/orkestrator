// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();

// Only the search hook is exported: if the input ever reached for a create-term
// mutation again, the missing export would throw here.
vi.mock("@/kraph/api/graphql", () => ({
  TermKind: { Entity: "ENTITY" },
  useSearchAssignableTermsQuery: (o: unknown) => search(o),
}));
vi.mock("@/hooks/use-debounce", () => ({ useDebounce: (v: unknown) => v }));

import { LabelInput } from "./LabelInput";

const term = (key: string, graphs: string[] = []) => ({
  id: `t-${key}`,
  kind: "ENTITY",
  key,
  label: null,
  color: null,
  categories: graphs.map((name) => ({ id: name, label: key, graph: { id: name, name } })),
});

beforeEach(() => {
  search.mockReset();
  // cmdk scrolls the highlighted row into view; jsdom has no layout.
  Element.prototype.scrollIntoView = vi.fn();
});

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Label this datum"), { target: { value } });

describe("LabelInput", () => {
  it("shows nothing until a word is typed, then searches entity words", () => {
    search.mockReturnValue({ data: { terms: [] }, loading: false });
    render(<LabelInput onClaim={vi.fn()} />);
    expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ skip: true }));
    type("AI");
    expect(search).toHaveBeenLastCalledWith(
      expect.objectContaining({ variables: { search: "AI", kinds: ["ENTITY"] }, skip: false }),
    );
  });

  it("offers existing words with where they are drawn, and claims the key on select", () => {
    const onClaim = vi.fn();
    search.mockReturnValue({ data: { terms: [term("AIS", ["Neurons", "Atlas"])] }, loading: false });
    render(<LabelInput onClaim={onClaim} />);
    type("AI");
    expect(screen.getByText("Neurons, Atlas")).toBeInTheDocument();
    fireEvent.click(screen.getByText("AIS"));
    expect(onClaim).toHaveBeenCalledWith("AIS");
  });

  it("claims a new word verbatim with no separate coin step", () => {
    const onClaim = vi.fn();
    search.mockReturnValue({ data: { terms: [] }, loading: false });
    render(<LabelInput onClaim={onClaim} />);
    type("Axon");
    fireEvent.click(screen.getByText(/Claim as “Axon”/));
    expect(onClaim).toHaveBeenCalledWith("Axon");
  });

  it("does not offer a new word that exactly matches an existing one", () => {
    search.mockReturnValue({ data: { terms: [term("AIS")] }, loading: false });
    render(<LabelInput onClaim={vi.fn()} />);
    type("AIS");
    expect(screen.queryByText(/Claim as/)).not.toBeInTheDocument();
    expect(screen.getByText("no graph draws this word yet")).toBeInTheDocument();
  });

  it("leaves out words already on the datum", () => {
    search.mockReturnValue({ data: { terms: [term("AIS"), term("Soma")] }, loading: false });
    render(<LabelInput onClaim={vi.fn()} excludeKeys={["AIS"]} />);
    type("S");
    expect(screen.queryByText("AIS")).not.toBeInTheDocument();
    expect(screen.getByText("Soma")).toBeInTheDocument();
    type("AIS");
    expect(screen.getByText(/Already claimed as AIS/)).toBeInTheDocument();
    expect(screen.queryByText(/Claim as/)).not.toBeInTheDocument();
  });
});
