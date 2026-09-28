import {describe, expect, it, vi} from "vitest";

import {createBlokCatalog, describeBlokCatalog} from "../runtime";
import {standardBlokFunctions} from "./index";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const catalog = createBlokCatalog("test", [], standardBlokFunctions);

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
    expect(catalog.functions.get("gt")).toBe(catalog.functions.get("compare.gt"));
    expect(catalog.functions.get("if")).toBe(catalog.functions.get("logic.if"));
    expect(catalog.functionDefinitions).toHaveLength(standardBlokFunctions.length);
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
    const gt = manifest.functions.find(fn => fn.name === "compare.gt");

    expect(gt).toEqual({
      name: "compare.gt",
      aliases: ["gt"],
      description: "True when a is greater than b.",
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
    expect(value("compare.gt", {0: 5, 1: 3})).toBe(true);
  });

  it("accepts named arguments", () => {
    expect(value("compare.gt", {a: 5, b: 3})).toBe(true);
  });

  it("accepts numeric strings where a number is expected", () => {
    expect(value("math.add", {a: "2", b: 3})).toBe(5);
  });

  it("rejects a non-numeric string with a message naming the value", () => {
    expect(failure("math.add", {a: "abc", b: 3})).toContain('"abc"');
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
    ["logic.if", {condition: true, trueValue: "y", falseValue: "n"}, "y"],
    ["logic.if", {condition: 0, trueValue: "y", falseValue: "n"}, "n"],
    ["logic.and", {values: [true, 1, "x"]}, true],
    ["logic.and", {values: [true, 0]}, false],
    ["logic.or", {values: [false, "", 1]}, true],
    ["logic.or", {values: [false, ""]}, false],
    ["logic.not", {value: ""}, true],
    ["logic.coalesce", {values: [null, undefined, 0, 5]}, 0],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });
});

describe("compare", () => {
  it.each([
    ["compare.eq", {a: 3, b: "3"}, true],
    ["compare.eq", {a: "abc", b: "abc"}, true],
    ["compare.eq", {a: {x: 1}, b: {x: 1}}, true],
    ["compare.eq", {a: "abc", b: "abd"}, false],
    ["compare.ne", {a: 1, b: 2}, true],
    ["compare.gte", {a: 3, b: 3}, true],
    ["compare.lt", {a: 3, b: 3}, false],
    ["compare.lte", {a: "2", b: 3}, true],
    ["compare.between", {value: 5, min: 1, max: 5}, true],
    ["compare.between", {value: 6, min: 1, max: 5}, false],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });
});

describe("math", () => {
  it.each([
    ["math.subtract", {a: 10, b: 4}, 6],
    ["math.multiply", {values: [2, 3, 4]}, 24],
    ["math.divide", {a: 10, b: 4}, 2.5],
    ["math.modulo", {a: 10, b: 3}, 1],
    ["math.round", {value: 3.14159, precision: 2}, 3.14],
    ["math.round", {value: 3.6}, 4],
    ["math.floor", {value: 3.9}, 3],
    ["math.abs", {value: -3}, 3],
    ["math.negate", {value: 3}, -3],
    ["math.min", {values: [3, 1, 2]}, 1],
    ["math.max", {values: [3, 1, 2]}, 3],
    ["math.clamp", {value: 12, min: 0, max: 10}, 10],
  ])("%s %o -> %o", (name, args, expected) => {
    expect(value(name, args)).toEqual(expected);
  });

  it("reports division by zero instead of returning Infinity", () => {
    expect(failure("math.divide", {a: 1, b: 0})).toContain("Division by zero");
    expect(failure("math.modulo", {a: 1, b: 0})).toContain("Modulo by zero");
  });
});

describe("strings", () => {
  it.each([
    ["str.concat", {values: ["a", 1, true]}, "a1true"],
    ["str.joinWith", {values: [", ", "a", "b"]}, "a, b"],
    ["str.upper", {value: "abc"}, "ABC"],
    ["str.capitalize", {value: "abc"}, "Abc"],
    ["str.trim", {value: "  x  "}, "x"],
    ["str.length", {value: "abcd"}, 4],
    ["str.contains", {value: "abcd", search: "bc"}, true],
    ["str.startsWith", {value: "abcd", search: "ab"}, true],
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
    ["list.length", {value: [1, 2]}, 2],
    ["list.isEmpty", {value: []}, true],
    ["list.first", {value: [1, 2]}, 1],
    ["list.last", {value: [1, 2]}, 2],
    ["list.at", {value: [1, 2, 3], index: -1}, 3],
    ["list.includes", {value: [1, 2], search: 2}, true],
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
    ["obj.get", {value: record, path: "user/name"}, "Ada"],
    ["obj.get", {value: record, path: "user/missing", fallback: "-"}, "-"],
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
    ["type.isNil", {value: null}, true],
    ["type.isEmpty", {value: []}, true],
    ["type.isEmpty", {value: {}}, true],
    ["type.isEmpty", {value: 0}, false],
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

describe("deprecations", () => {
  it("keeps is_admin working but marks it deprecated", () => {
    expect(value("is_admin", {role: "admin"})).toBe(true);
    expect(catalog.functions.get("is_admin")?.deprecated).toContain("compare.eq");
  });
});
