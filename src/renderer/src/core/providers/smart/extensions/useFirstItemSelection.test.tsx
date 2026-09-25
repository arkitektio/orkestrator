// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFirstItemSelection } from "./useFirstItemSelection";

const mount = () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const item = (value: string, disabled = false) => {
    const node = document.createElement("div");
    node.setAttribute("cmdk-item", "");
    node.setAttribute("data-value", value);
    if (disabled) node.setAttribute("aria-disabled", "true");
    root.appendChild(node);
  };
  return { root, item };
};

describe("useFirstItemSelection", () => {
  it("selects the first enabled item whenever the signal changes", () => {
    const { root, item } = mount();
    const { result, rerender } = renderHook(({ signal }) => useFirstItemSelection(signal), {
      initialProps: { signal: [0] as readonly unknown[] },
    });
    (result.current.rootRef as React.MutableRefObject<HTMLDivElement | null>).current = root;
    item("gone", true);
    item("first");
    item("second");
    rerender({ signal: [1] });
    expect(result.current.value).toBe("first");
  });

  it("stops re-pinning after the user moved, and resumes on repin()", () => {
    const { root, item } = mount();
    const { result, rerender } = renderHook(({ signal }) => useFirstItemSelection(signal), {
      initialProps: { signal: [0] as readonly unknown[] },
    });
    (result.current.rootRef as React.MutableRefObject<HTMLDivElement | null>).current = root;
    item("first");
    rerender({ signal: [1] });
    expect(result.current.value).toBe("first");

    act(() => {
      result.current.onKeyDown({ key: "ArrowDown" } as React.KeyboardEvent);
      result.current.setValue("second");
    });
    rerender({ signal: [2] });
    expect(result.current.value).toBe("second");

    act(() => result.current.repin());
    expect(result.current.value).toBe("first");
  });
});
