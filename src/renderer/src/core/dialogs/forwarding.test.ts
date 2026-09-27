import { describe, expect, it } from "vitest";
import { forwardableRequest } from "./DialogProvider";

describe("forwardableRequest", () => {
  it("carries id, props and the size, never the container", () => {
    const container = {} as HTMLElement;
    expect(forwardableRequest("sheet", "kuvertcompose", { replyTo: "m1", mode: "reply" }, { size: "large", container })).toEqual({
      type: "sheet",
      id: "kuvertcompose",
      props: { replyTo: "m1", mode: "reply" },
      options: { className: undefined, side: undefined, size: "large" },
    });
  });

  it("refuses props that cannot cross a window", () => {
    expect(forwardableRequest("dialog", "x", { onDone: () => {} })).toBeNull();
  });
});
