import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: {}, session: {} }));

import { FACTORY_RESET_MARKER, consumeFactoryReset } from "./FactoryReset";

const userData = () => {
  const dir = mkdtempSync(join(tmpdir(), "orkestrator-reset-"));
  writeFileSync(join(dir, "config.json"), "{}");
  mkdirSync(join(dir, "mesh", "node"), { recursive: true });
  writeFileSync(join(dir, "mesh", "node", "tailscaled.state"), "x");
  mkdirSync(join(dir, "Local Storage"));
  return dir;
};

describe("consumeFactoryReset", () => {
  it("leaves userData alone without a marker", () => {
    const dir = userData();
    expect(consumeFactoryReset(dir)).toBe(false);
    expect(readdirSync(dir).sort()).toEqual(["Local Storage", "config.json", "mesh"]);
  });

  it("empties userData, marker included, when a reset was requested", () => {
    const dir = userData();
    writeFileSync(join(dir, FACTORY_RESET_MARKER), "now");
    expect(consumeFactoryReset(dir)).toBe(true);
    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir)).toEqual([]);
    expect(consumeFactoryReset(dir)).toBe(false);
  });
});
