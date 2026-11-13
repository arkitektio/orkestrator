import { describe, expect, it } from "vitest";
import type { NetworkChange } from "../../../../../../main/network/protocol";
import { watchNetwork } from "./reachability";

describe("watchNetwork", () => {
  it("reports the browser coming online and what main sees, until it is stopped", () => {
    const target = new EventTarget();
    let fromMain: (change: NetworkChange) => void = () => {};
    let unbound = false;
    const heard: string[] = [];
    const stop = watchNetwork((why) => heard.push(why), {
      target: target as unknown as Window,
      bridge: {
        onChange: (cb) => {
          fromMain = cb;
          return () => (unbound = true);
        },
      },
    });

    target.dispatchEvent(new Event("online"));
    fromMain({ reason: "interfaces" });
    fromMain({ reason: "resume" });
    expect(heard).toEqual(["online", "interfaces", "resume"]);

    stop();
    target.dispatchEvent(new Event("online"));
    expect(heard).toHaveLength(3);
    expect(unbound).toBe(true);
  });

  it("copes without main (a browser build)", () => {
    const stop = watchNetwork(() => {}, { target: new EventTarget() as unknown as Window, bridge: undefined });
    expect(() => stop()).not.toThrow();
  });
});
