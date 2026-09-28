// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PageAction } from "@/core/ui/page-action";
import { PageActionBar } from "./PageActionBar";

/**
 * jsdom lays nothing out, so widths come from `data-w` on the element or its
 * first child (the wrapper the row puts around each action).
 */
const sizeOf = (element: HTMLElement) => {
  const own = element.dataset.w ?? (element.firstElementChild as HTMLElement | null)?.dataset.w;
  return own ? Number(own) : 0;
};

const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth");

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return sizeOf(this as HTMLElement);
    },
  });
  Object.defineProperty(Element.prototype, "clientWidth", {
    configurable: true,
    get() {
      return sizeOf(this as HTMLElement);
    },
  });
});

afterAll(() => {
  if (offsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidth);
  if (clientWidth) Object.defineProperty(Element.prototype, "clientWidth", clientWidth);
});

describe("PageActionBar", () => {
  it("keeps every action in the row while they fit", () => {
    render(
      <PageActionBar data-w="400">
        <button data-w="100">One</button>
        <button data-w="100">Two</button>
      </PageActionBar>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.queryByLabelText("More actions")).toBeNull();
  });

  it("moves the actions that spill into the burger, rightmost first", async () => {
    render(
      <PageActionBar data-w="250">
        <button data-w="100">One</button>
        <button data-w="100">Two</button>
        <>
          <button data-w="100">Three</button>
        </>
      </PageActionBar>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.queryByText("Three")).toBeNull();

    await userEvent.click(screen.getByLabelText("More actions"));
    expect(await screen.findByText("Three")).toBeInTheDocument();
  });

  it("keeps a pinned action in the row and evicts the rest", async () => {
    render(
      <PageActionBar data-w="150">
        <button data-w="100">Filter</button>
        <PageAction alwaysShow data-w="100">
          New
        </PageAction>
      </PageActionBar>,
    );
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("drops an action's label before the action itself", () => {
    render(
      <PageActionBar data-w="150">
        <button data-w="100">One</button>
        <PageAction collapse="icon" icon={<span data-testid="glyph" />} data-w="100">
          Sort
        </PageAction>
      </PageActionBar>,
    );
    expect(screen.getByTestId("glyph")).toBeInTheDocument();
    expect(screen.queryByText("Sort")).toBeNull();
    expect(screen.queryByLabelText("More actions")).toBeNull();
  });
});
