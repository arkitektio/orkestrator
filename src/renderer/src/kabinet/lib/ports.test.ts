import { describe, expect, it } from "vitest";
import { portWord, signature } from "./ports";

const port = (kind: string, identifier?: string, nullable = false) => ({ key: kind, kind, identifier, nullable });

describe("portWord", () => {
  it("names a structure by the end of its identifier", () => {
    expect(portWord(port("STRUCTURE", "@mikro/image"))).toBe("image");
  });

  it("names anything else by its kind, marking optional ports", () => {
    expect(portWord(port("INT", undefined, true))).toBe("int?");
  });
});

describe("signature", () => {
  it("reads takes → returns", () => {
    expect(signature([port("STRUCTURE", "@mikro/image"), port("INT")], [port("STRUCTURE", "@mikro/table")])).toBe(
      "image, int → table",
    );
  });

  it("keeps the arrow when either side is empty", () => {
    expect(signature([], [port("STRING")])).toBe("→ string");
    expect(signature([port("STRING")], [])).toBe("string →");
    expect(signature([], [])).toBe("→");
  });
});
