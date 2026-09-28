import { describe, expect, it } from "vitest";
import { coordinationBase } from "./coordination";

describe("coordinationBase", () => {
  it("drops lok's fakts route", () => {
    expect(coordinationBase("https://go.arkitekt.live/lok/f/")).toBe("https://go.arkitekt.live");
  });

  it("keeps a deployment prefix and a port", () => {
    expect(coordinationBase("http://localhost:8080/arkitekt/lok/f/")).toBe(
      "http://localhost:8080/arkitekt",
    );
  });

  it("is the server itself when the endpoint has no lok route", () => {
    expect(coordinationBase("https://alpha.test/")).toBe("https://alpha.test");
  });
});
