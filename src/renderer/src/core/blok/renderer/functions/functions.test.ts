import {describe, expect, it, vi} from "vitest";

import {createBlokCatalog, describeBlokCatalog} from "../runtime";
import {effectFunctions, standardBlokFunctions, variadicBlokFunctions} from "./index";

const catalog = createBlokCatalog("test", [], [...standardBlokFunctions, ...variadicBlokFunctions, ...effectFunctions]);

/** Invokes a pure function the way a value-position prop would. */
const call = (name: string, args: Record<string, unknown>) =>
  catalog.invokeFunction(name, args, {requirePure: true});

const value = (name: string, args: Record<string, unknown>) => {
  const result = call(name, args);
  if (!result.ok) {
    throw new Error(`${name} failed: ${result.error}`);
  }
  return result.value;
};

const failure = (name: string, args: Record<string, unknown>) => {
  const result = call(name, args);
  expect(result.ok).toBe(false);
  return result.ok === false ? result.error : "";
};

describe("catalog registration", () => {
  it("registers every function under a unique name", () => {
    const names = standardBlokFunctions.map(fn => fn.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("registers aliases without duplicating definitions", () => {
    expect(catalog.functionDefinitions).toHaveLength(standardBlokFunctions.length + variadicBlokFunctions.length + effectFunctions.length);
  });

  it("leaves the bare base names to the base operations", () => {
    expect(catalog.functions.get("gt")?.name).toBe("gt");
    expect(catalog.functions.get("if")?.name).toBe("if");
  });

  it("does not let an alias collide with another function's name", () => {
    const names = new Set(standardBlokFunctions.map(fn => fn.name));
    standardBlokFunctions.forEach(fn => {
      fn.aliases.forEach(alias => expect(names.has(alias)).toBe(false));
    });
  });

  it("gives every function a description and a declared return type", () => {
    standardBlokFunctions.forEach(fn => {
      expect(fn.description.length).toBeGreaterThan(0);
      expect(fn.returnType).toBeTruthy();
    });
  });

  it("describes itself as a serializable manifest", () => {
    const manifest = describeBlokCatalog(catalog);
    const gt = manifest.functions.find(fn => fn.name === "gt");

    expect(gt).toEqual({
      name: "gt",
      aliases: [],
      description: "True if a > b. Non-numbers compare false.",
      returnType: "boolean",
      purity: "pure",
      variadic: false,
      args: ["a", "b"],
    });
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });
});

describe("argument shapes", () => {
  it("accepts positional arguments in schema order", () => {
    expect(value("gt", {0: 5, 1: 3})).toBe(true);
  });

  it("accepts named arguments", () => {
    expect(value("gt", {a: 5, b: 3})).toBe(true);
  });

  it("accepts numeric strings where a number is expected", () => {
    expect(value("add", {a: "2", b: 3})).toBe(5);
  });

  it("rejects a non-numeric string with a message naming the value", () => {
    expect(failure("math.round", {value: "abc"})).toContain('"abc"');
  });

  it("collects variadic values from positional keys", () => {
    expect(value("math.sum", {0: 1, 1: 2, 2: 3})).toBe(6);
  });

  it("collects variadic values from an explicit values array", () => {
    expect(value("math.sum", {values: [1, 2, 3]})).toBe(6);
  });

  it("orders more than ten positional variadic values numerically", () => {
    const args = Object.fromEntries(Array.from({length: 11}, (_, index) => [index, index]));
    // Key order here is the trap: "10" sorts before "2" lexically.
    expect(value("str.concat", args)).toBe("012345678910");
  });

  it("validates each variadic item", () => {
    expect(failure("math.sum", {values: [1, "nope"]})).toContain("Expected a number");
  });
});

describe("logic", () => {
  it.each([
    ["if", {condition: true, then: "y", otherwise: "n"}, "y"],
    ["if", {condition: 1, then: "y", otherwise: "n"}, "n"],
    ["logic.and", {values: [true, 1, "x"]}, true],
    ["logic.and", {values: [true, 0]}, false],
    ["logic.or", {values: [false, "", 1]}, true],
    ["logic.or", {values: [false, ""]}, false],
    ["not", {a: false}, true],
    ["and", {a: true, b: 1}, false],
    ["logic.coalesce", {values: [null, undefined, 0, 5]}, 0],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });
});

describe("comparison", () => {
  it.each([
    ["eq", {a: 3, b: "3"}, false],
    ["eq", {a: "abc", b: "abc"}, true],
    ["eq", {a: {x: 1}, b: {x: 1}}, true],
    ["eq", {a: "abc", b: "abd"}, false],
    ["ne", {a: 1, b: 2}, true],
    ["gte", {a: 3, b: 3}, true],
    ["lt", {a: 3, b: 3}, false],
    ["lte", {a: "2", b: 3}, true],
    ["between", {value: 5, min: 1, max: 5}, true],
    ["between", {value: 6, min: 1, max: 5}, false],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });
});

describe("math", () => {
  it.each([
    ["sub", {a: 10, b: 4}, 6],
    ["math.multiply", {values: [2, 3, 4]}, 24],
    ["div", {a: 10, b: 4}, 2.5],
    ["mod", {a: 10, b: 3}, 1],
    ["math.round", {value: 3.14159, precision: 2}, 3.14],
    ["math.round", {value: 3.6}, 4],
    ["math.floor", {value: 3.9}, 3],
    ["math.abs", {value: -3}, 3],
    ["neg", {a: 3}, -3],
    ["math.min", {values: [3, 1, 2]}, 1],
    ["math.max", {values: [3, 1, 2]}, 3],
    ["math.clamp", {value: 12, min: 0, max: 10}, 10],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });

  it("answers null for a division by zero instead of Infinity", () => {
    expect(value("div", {a: 1, b: 0})).toBeNull();
    expect(value("mod", {a: 1, b: 0})).toBeNull();
  });
});

describe("strings", () => {
  it.each([
    ["str.concat", {values: ["a", 1, true]}, "a1true"],
    ["str.joinWith", {values: [", ", "a", "b"]}, "a, b"],
    ["str.upper", {value: "abc"}, "ABC"],
    ["str.capitalize", {value: "abc"}, "Abc"],
    ["str.trim", {value: "  x  "}, "x"],
    ["len", {a: "abcd"}, 4],
    ["contains", {haystack: "abcd", needle: "bc"}, true],
    ["starts_with", {value: "abcd", prefix: "ab"}, true],
    ["str.slice", {value: "abcdef", start: 1, end: 3}, "bc"],
    ["str.replace", {value: "a-b-c", search: "-", replacement: "+"}, "a+b+c"],
    ["str.split", {value: "a,b", separator: ","}, ["a", "b"]],
    ["str.default", {value: "   ", fallback: "none"}, "none"],
    ["str.default", {value: 0, fallback: "none"}, "0"],
    ["str.truncate", {value: "abcdefgh", length: 5}, "abcd…"],
    ["str.truncate", {value: "abc", length: 5}, "abc"],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });

  it("fills template placeholders from named arguments", () => {
    expect(value("str.template", {template: "Hi {name}, you have {count}.", name: "Ada", count: 3}))
      .toBe("Hi Ada, you have 3.");
  });

  it("leaves an unknown placeholder visible rather than blanking it", () => {
    expect(value("str.template", {template: "Hi {missing}"})).toBe("Hi {missing}");
  });
});

describe("lists", () => {
  const rows = [{n: 3}, {n: 1}, {n: 2}];

  it.each([
    ["len", {a: [1, 2]}, 2],
    ["is_empty", {a: []}, true],
    ["list.first", {value: [1, 2]}, 1],
    ["list.last", {value: [1, 2]}, 2],
    ["list.at", {value: [1, 2, 3], index: -1}, 3],
    ["in", {value: 2, options: [1, 2]}, true],
    ["list.join", {value: ["a", "b"], separator: "-"}, "a-b"],
    ["list.slice", {value: [1, 2, 3], start: 1}, [2, 3]],
    ["list.reverse", {value: [1, 2]}, [2, 1]],
    ["list.unique", {value: [1, 1, 2]}, [1, 2]],
    ["list.compact", {value: [1, null, 2, undefined]}, [1, 2]],
    ["list.sum", {value: [1, "2", 3]}, 6],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });

  it("plucks a path out of every item", () => {
    expect(value("list.pluck", {value: rows, path: "n"})).toEqual([3, 1, 2]);
  });

  it("sorts by a path without mutating the input", () => {
    expect(value("list.sort", {value: rows, path: "n"})).toEqual([{n: 1}, {n: 2}, {n: 3}]);
    expect(value("list.sort", {value: rows, path: "n", descending: true})).toEqual([
      {n: 3},
      {n: 2},
      {n: 1},
    ]);
    // The data model is live state; a sort must not reorder it in place.
    expect(rows).toEqual([{n: 3}, {n: 1}, {n: 2}]);
  });

  it("does not reverse the input in place", () => {
    const source = [1, 2, 3];
    value("list.reverse", {value: source});
    expect(source).toEqual([1, 2, 3]);
  });
});

describe("objects", () => {
  const record = {user: {name: "Ada", tags: ["x"]}};

  it.each([
    ["get", {value: record, path: "/user/name"}, "Ada"],
    ["get", {value: record, path: "/user/missing"}, null],
    ["obj.has", {value: record, path: "user/name"}, true],
    ["obj.has", {value: record, path: "user/nope"}, false],
    ["obj.keys", {value: {a: 1, b: 2}}, ["a", "b"]],
    ["obj.values", {value: {a: 1, b: 2}}, [1, 2]],
    ["obj.entries", {value: {a: 1}}, [{key: "a", value: 1}]],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });
});

describe("formatting", () => {
  it("formats percentages and byte counts", () => {
    expect(value("fmt.percent", {value: 0.256, precision: 1})).toBe("25.6%");
    expect(value("fmt.bytes", {value: 512})).toBe("512 B");
    expect(value("fmt.bytes", {value: 1_500_000})).toBe("1.5 MB");
    expect(value("fmt.bytes", {value: -2000})).toBe("-2.0 kB");
  });

  it("formats a date and rejects one it cannot parse", () => {
    expect(typeof value("fmt.date", {value: "2026-01-15T00:00:00Z"})).toBe("string");
    expect(failure("fmt.date", {value: "not-a-date"})).toContain("Expected a date");
  });

  it("formats a relative time against now", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(value("fmt.relativeTime", {value: threeHoursAgo})).toContain("3 hours");
  });

  it("renders JSON", () => {
    expect(value("fmt.json", {value: {a: 1}})).toBe('{"a":1}');
  });
});

describe("type coercion", () => {
  it.each([
    ["is_null", {a: null}, true],
    ["is_empty", {a: []}, true],
    ["is_empty", {a: {}}, true],
    ["is_empty", {a: 0}, false],
    ["type.of", {value: []}, "list"],
    ["type.of", {value: null}, "null"],
    ["type.toString", {value: null}, ""],
    ["type.toString", {value: {a: 1}}, '{"a":1}'],
    ["type.toNumber", {value: " 42 "}, 42],
    ["type.toNumber", {value: "x", fallback: 0}, 0],
    ["type.toBoolean", {value: "false"}, false],
    ["type.toBoolean", {value: "0"}, false],
    ["type.toBoolean", {value: "yes"}, true],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });

  it("fails a conversion it cannot make when no fallback is given", () => {
    expect(failure("type.toNumber", {value: "x"})).toContain("Cannot convert");
  });
});

describe("effects", () => {
  it.each(["logger.info", "logger.warn", "logger.error", "clipboard.copy"])(
    "%s is refused in value position",
    name => {
      const result = catalog.invokeFunction(name, {value: "x"}, {requirePure: true});
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toContain("side effects");
    },
  );

  it("runs a logger from action position", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = catalog.invokeFunction("logger.info", {0: "hello"}, {requirePure: false});

    expect(result).toEqual({ok: true, value: "hello"});
    expect(consoleInfo).toHaveBeenCalledWith("blok logger.info", "hello");
    consoleInfo.mockRestore();
  });
});
