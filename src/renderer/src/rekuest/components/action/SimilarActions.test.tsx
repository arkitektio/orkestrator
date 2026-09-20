// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("@/rekuest/api/graphql", () => ({
  useSimilarActionsQuery: (o: unknown) => query(o),
}));

vi.mock("../cards/ActionCard", () => ({
  default: ({ item }: { item: { id: string; name: string } }) => (
    <div data-testid="card">{item.name}</div>
  ),
}));

import { SIMILAR_LIMIT, SimilarActions } from "./SimilarActions";

beforeEach(() => {
  query.mockReset();
});

describe("SimilarActions", () => {
  it("asks for the nearest few of this action", () => {
    query.mockReturnValue({ data: undefined });
    render(<SimilarActions id="42" />);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { id: "42", limit: SIMILAR_LIMIT } }),
    );
  });

  it("shows nothing while loading", () => {
    query.mockReturnValue({ data: undefined, loading: true });
    const { container } = render(<SimilarActions id="42" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when the server has no neighbours (no vector yet)", () => {
    query.mockReturnValue({ data: { similarActions: [] } });
    const { container } = render(<SimilarActions id="42" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one card per neighbour, in the server's order", () => {
    query.mockReturnValue({
      data: {
        similarActions: [
          { id: "1", name: "Blur image" },
          { id: "2", name: "Smooth image" },
        ],
      },
    });
    render(<SimilarActions id="42" />);
    expect(screen.getByText("Similar actions")).toBeInTheDocument();
    const cards = screen.getAllByTestId("card");
    expect(cards.map((c) => c.textContent)).toEqual(["Blur image", "Smooth image"]);
  });
});
