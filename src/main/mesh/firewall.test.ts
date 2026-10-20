import { describe, expect, it } from "vitest";
import { parseFirewallActions } from "./firewall";

describe("parseFirewallActions", () => {
  it("is none when Windows has made no rule yet", () => {
    expect(parseFirewallActions("")).toBe("none");
    expect(parseFirewallActions("\r\n")).toBe("none");
  });

  it("reads allow, block and both", () => {
    expect(parseFirewallActions("Allow\r\nAllow\r\n")).toBe("allow");
    expect(parseFirewallActions("Block\r\n")).toBe("block");
    expect(parseFirewallActions("Allow\r\nBlock\r\n")).toBe("mixed");
  });
});
