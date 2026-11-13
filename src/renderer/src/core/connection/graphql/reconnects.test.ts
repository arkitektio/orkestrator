import { describe, expect, it, vi } from "vitest";
import { emitSocketReconnect, onSocketReconnect } from "./reconnects";

describe("socket reconnects", () => {
  it("tells whoever listens on that client, and nobody else", () => {
    const [rekuest, mikro] = [{}, {}];
    const [heard, other] = [vi.fn(), vi.fn()];
    onSocketReconnect(rekuest, heard);
    onSocketReconnect(mikro, other);

    emitSocketReconnect(rekuest);

    expect(heard).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  });

  it("stops telling a listener that left, and survives one that throws", () => {
    const client = {};
    const [left, stays] = [vi.fn(), vi.fn()];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const leave = onSocketReconnect(client, left);
    onSocketReconnect(client, () => {
      throw new Error("a listener of another module");
    });
    onSocketReconnect(client, stays);
    leave();

    emitSocketReconnect(client);

    expect(left).not.toHaveBeenCalled();
    expect(stays).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("is quiet for a client nobody listens on", () => {
    expect(() => emitSocketReconnect({})).not.toThrow();
  });
});
