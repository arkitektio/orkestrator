// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OverflowActions, fitCount } from "./OverflowActions";

describe("fitCount", () => {
  it("shows everything when everything fits, burger or no burger", () => {
    expect(fitCount([100, 100, 100], 308, 4, 40)).toBe(3);
  });
  it("charges the burger first and fills from the left", () => {
    // 40 + 4+100 + 4+100 = 248 fits; the third would make 352.
    expect(fitCount([100, 100, 100], 250, 4, 40)).toBe(2);
    expect(fitCount([100, 100, 100], 100, 4, 40)).toBe(0);
  });
});

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

describe("OverflowActions", () => {
  it("keeps every action in the row while they fit", () => {
    render(
      <OverflowActions data-w="400">
        <button data-w="100">One</button>
        <button data-w="100">Two</button>
      </OverflowActions>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.queryByLabelText("More actions")).toBeNull();
  });

  it("moves the actions that spill into the burger, rightmost first", async () => {
    render(
      <OverflowActions data-w="250">
        <button data-w="100">One</button>
        <button data-w="100">Two</button>
        <>
          <button data-w="100">Three</button>
        </>
      </OverflowActions>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.queryByText("Three")).toBeNull();

    await userEvent.click(screen.getByLabelText("More actions"));
    expect(await screen.findByText("Three")).toBeInTheDocument();
  });
});
