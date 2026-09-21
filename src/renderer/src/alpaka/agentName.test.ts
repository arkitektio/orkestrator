import { describe, expect, it } from "vitest";
import { agentDisplayName, displayInitials } from "./agentName";

describe("agentDisplayName", () => {
  it("prefers the name a bot registered itself under", () => {
    expect(
      agentDisplayName({
        id: "1",
        name: "ollama-replyer",
        user: { preferredUsername: "jhnnsrs" },
      }),
    ).toBe("ollama-replyer");
  });

  it("falls back to the user behind a default agent", () => {
    expect(
      agentDisplayName({
        id: "1",
        name: "default",
        user: { preferredUsername: "jhnnsrs" },
      }),
    ).toBe("jhnnsrs");
  });

  it("never leaks the raw agent id", () => {
    expect(agentDisplayName({ id: "42", name: null, user: null })).toBe("Unknown");
    expect(agentDisplayName(undefined, "Assistant")).toBe("Assistant");
  });

  it("ignores whitespace-only names", () => {
    expect(
      agentDisplayName({ id: "1", name: "  ", user: { preferredUsername: "jhnnsrs" } }),
    ).toBe("jhnnsrs");
  });

  it("keeps a default agent's own name when no user is attached", () => {
    expect(agentDisplayName({ id: "1", name: "default", user: null })).toBe("default");
  });
});

describe("displayInitials", () => {
  it("takes the first two letters of a single word", () => {
    expect(displayInitials("jhnnsrs")).toBe("JH");
  });

  it("takes one letter from each of the first two words", () => {
    expect(displayInitials("ollama replyer")).toBe("OR");
    expect(displayInitials("ollama-replyer")).toBe("OR");
  });

  it("falls back when there is nothing to abbreviate", () => {
    expect(displayInitials("   ", "??")).toBe("??");
    expect(displayInitials(undefined)).toBe("?");
  });
});
