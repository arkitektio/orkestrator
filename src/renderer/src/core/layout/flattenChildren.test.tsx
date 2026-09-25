import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { flattenChildren } from "./flattenChildren";

describe("flattenChildren", () => {
  it("keeps keys unique across sibling fragments", () => {
    const items = flattenChildren(
      <>
        <>
          <button>One</button>
        </>
        <>
          <button>Two</button>
        </>
        <button>Three</button>
      </>,
    );
    const keys = items.map((item) => (isValidElement(item) ? item.key : null));
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
  });
});
