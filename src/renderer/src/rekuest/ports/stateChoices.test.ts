import { describe, expect, it } from "vitest";
import {
  choiceKey,
  choicesSignature,
  filterChoices,
  pathSegments,
  readPath,
  stateChoiceOptions,
} from "./stateChoices";

describe("state choice paths", () => {
  it("read dotted paths and JSON pointers alike", () => {
    expect(pathSegments("stage.positions")).toEqual(["stage", "positions"]);
    expect(pathSegments("/stage/positions")).toEqual(["stage", "positions"]);
    expect(pathSegments(null)).toEqual([]);
  });

  it("walk into records and arrays, undefined where a step is missing", () => {
    const state = { stage: { positions: [{ name: "a" }] } };
    expect(readPath(state, ["stage", "positions", "0", "name"])).toBe("a");
    expect(readPath(state, ["stage", "nope", "x"])).toBeUndefined();
    expect(readPath(state, [])).toBe(state);
  });
});

describe("choiceKey", () => {
  it("is the same for a number and its text, and for objects in any key order", () => {
    expect(choiceKey(1)).toBe(choiceKey("1"));
    expect(choiceKey({ a: 1, b: 2 })).toBe(choiceKey({ b: 2, a: 1 }));
    expect(choiceKey(0)).toBe("0");
    expect(choiceKey(null)).toBeUndefined();
  });
});

describe("stateChoiceOptions", () => {
  it("keeps a primitive's type as the value", () => {
    const options = stateChoiceOptions([1, 2], null, false);
    expect(options.map((option) => option.value)).toEqual([1, 2]);
    expect(options.map((option) => option.label)).toEqual(["1", "2"]);
  });

  it("reads value, label and description through accessors", () => {
    const options = stateChoiceOptions(
      [{ uid: 7, title: "Seven", meta: { note: "lucky" } }],
      [
        { optionKey: "VALUE", path: "uid" },
        { optionKey: "LABEL", path: "/title" },
        { optionKey: "DESCRIPTION", path: "meta.note" },
      ],
      false,
    );
    expect(options).toEqual([{ key: "7", value: 7, label: "Seven", description: "lucky" }]);
  });

  it("offers an entry whose value is 0 or false", () => {
    const options = stateChoiceOptions([{ id: 0, name: "Zero" }], null, false);
    expect(options).toEqual([{ key: "0", value: 0, label: "Zero", description: undefined }]);
  });

  it("gives an object port the whole entry", () => {
    const entry = { name: "Home", X: 1, Y: 2 };
    const [option] = stateChoiceOptions([entry], null, true);
    expect(option.value).toBe(entry);
    expect(option.label).toBe("Home");
  });

  it("a VALUE accessor without a path is the entry itself", () => {
    const entry = { name: "Home" };
    expect(stateChoiceOptions([entry], [{ optionKey: "VALUE" }], false)[0].value).toBe(entry);
  });

  it("drops duplicates and entries with nothing to send", () => {
    const options = stateChoiceOptions(["a", "a", null, { X: 1 }, { name: "Home", X: 1 }], null, false);
    expect(options.map((option) => option.key)).toEqual(["a", "Home"]);
  });
});

describe("filterChoices / choicesSignature", () => {
  const options = stateChoiceOptions([{ id: 1, name: "Alpha" }, { id: 2, name: "Beta" }], null, false);

  it("narrows by label", () => {
    expect(filterChoices(options, " alp ").map((option) => option.key)).toEqual(["1"]);
    expect(filterChoices(options, "")).toHaveLength(2);
  });

  it("stays the same while the choices do", () => {
    const again = stateChoiceOptions([{ id: 1, name: "Alpha", moved: true }, { id: 2, name: "Beta" }], null, false);
    expect(choicesSignature(again)).toBe(choicesSignature(options));
    expect(choicesSignature(options.slice(0, 1))).not.toBe(choicesSignature(options));
  });
});
