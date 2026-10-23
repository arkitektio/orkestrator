import { describe, expect, it } from "vitest";
import { createBlokCatalog } from "../runtime";
import { BLOK_ANSWER_FUNCTION, effectFunctions } from "./effects";

const catalog = createBlokCatalog("test", [], effectFunctions);

describe("blok.answer", () => {
  it("is refused where nothing waits for an answer", () => {
    expect(catalog.invokeFunction(BLOK_ANSWER_FUNCTION, { values: { image: 1 } })).toEqual({
      ok: false,
      error: expect.stringContaining("Nothing is waiting for an answer"),
    });
  });

  it("is an effect: never run while a prop resolves", () => {
    const result = catalog.invokeFunction(BLOK_ANSWER_FUNCTION, { values: {} }, { requirePure: true });
    expect(result.ok).toBe(false);
  });
});
