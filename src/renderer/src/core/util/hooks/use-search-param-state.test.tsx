// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "./use-search-param-state";

const flush = () => act(async () => {});

describe("parsers", () => {
  it("round-trips an ISO date and rejects garbage", () => {
    const d = new Date("2026-09-16T10:00:00.000Z");
    expect(parseAsIsoDateTime.parse(parseAsIsoDateTime.serialize(d))?.getTime()).toBe(d.getTime());
    // An unparseable date is "no filter", never `Invalid Date` in a variable.
    expect(parseAsIsoDateTime.parse("not a date")).toBeNull();
  });

  it("parses only literal booleans", () => {
    expect(parseAsBoolean.parse("true")).toBe(true);
    expect(parseAsBoolean.parse("false")).toBe(false);
    expect(parseAsBoolean.parse("yes")).toBeNull();
  });

  it("accepts only the listed literals", () => {
    const p = parseAsStringLiteral(["ASC", "DESC"] as const);
    expect(p.parse("ASC")).toBe("ASC");
    expect(p.parse("UP")).toBeNull();
  });

  it("splits arrays and drops unparseable members", () => {
    const p = parseAsArrayOf(parseAsStringLiteral(["a", "b"] as const));
    expect(p.parse("a,zz,b")).toEqual(["a", "b"]);
    expect(p.parse("")).toEqual([]);
    expect(p.serialize(["b", "a"])).toBe("b,a");
  });

  it("withDefault does not mutate the base parser", () => {
    const withDefault = parseAsString.withDefault("x");
    expect(withDefault.defaultValue).toBe("x");
    expect(parseAsString.defaultValue).toBeUndefined();
  });
});

const Probe = () => {
  const { search } = useLocation();
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const [, setAfter] = useQueryState("after", parseAsIsoDateTime);
  const [, setBefore] = useQueryState("before", parseAsIsoDateTime);
  const [done, setDone] = useQueryState("done", parseAsBoolean);
  const [kinds, setKinds] = useQueryState(
    "kinds",
    parseAsArrayOf(parseAsStringLiteral(["A", "B", "C"] as const)).withDefault([]),
  );

  return (
    <div>
      <span data-testid="search">{search}</span>
      <span data-testid="q">{q}</span>
      <span data-testid="done">{String(done)}</span>
      <span data-testid="kinds">{kinds.join("|")}</span>
      <button onClick={() => setQ("hello")}>set-q</button>
      <button onClick={() => setQ("")}>clear-q-via-default</button>
      <button onClick={() => setQ(null)}>clear-q-via-null</button>
      <button onClick={() => setDone((prev) => (prev === true ? null : true))}>toggle-done</button>
      <button onClick={() => setKinds((prev) => (prev.includes("B") ? prev.filter((k) => k !== "B") : [...prev, "B"]))}>
        toggle-B
      </button>
      <button
        onClick={() => {
          // Four writes in one handler — the case that breaks a naive
          // react-router setter, because each reads render-time params.
          setAfter(new Date("2026-01-01T00:00:00.000Z"));
          setBefore(new Date("2026-02-01T00:00:00.000Z"));
          setDone(true);
          setKinds(["A", "C"]);
        }}
      >
        set-four
      </button>
      <button
        onClick={() => {
          setAfter(null);
          setBefore(null);
          setDone(null);
          setKinds([]);
        }}
      >
        clear-four
      </button>
    </div>
  );
};

const renderAt = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/tasks${search}`]}>
      <Probe />
    </MemoryRouter>,
  );

const click = async (label: string) => {
  act(() => screen.getByText(label).click());
  await flush();
};

describe("useQueryState", () => {
  it("reads the value from the URL and applies the default when absent", () => {
    renderAt("?q=abc");
    expect(screen.getByTestId("q").textContent).toBe("abc");
    expect(screen.getByTestId("done").textContent).toBe("null");
  });

  it("writes a value into the search string", async () => {
    renderAt();
    await click("set-q");
    expect(screen.getByTestId("search").textContent).toBe("?q=hello");
    expect(screen.getByTestId("q").textContent).toBe("hello");
  });

  it("removes the key when set back to the default (clearOnDefault)", async () => {
    renderAt("?q=hello");
    await click("clear-q-via-default");
    expect(screen.getByTestId("search").textContent).toBe("");
  });

  it("removes the key when set to null", async () => {
    renderAt("?q=hello");
    await click("clear-q-via-null");
    expect(screen.getByTestId("search").textContent).toBe("");
  });

  it("supports the updater form and sees the current value", async () => {
    renderAt();
    await click("toggle-done");
    expect(screen.getByTestId("done").textContent).toBe("true");
    await click("toggle-done");
    expect(screen.getByTestId("done").textContent).toBe("null");
  });

  it("updates arrays through the updater form", async () => {
    renderAt("?kinds=A");
    await click("toggle-B");
    expect(screen.getByTestId("kinds").textContent).toBe("A|B");
    await click("toggle-B");
    expect(screen.getByTestId("kinds").textContent).toBe("A");
  });

  it("lands all four writes made in one handler", async () => {
    // The batching guarantee. Without it the last setter's render-time
    // params would win and three filters would silently vanish.
    renderAt();
    await click("set-four");
    const params = new URLSearchParams(screen.getByTestId("search").textContent ?? "");
    expect(params.get("after")).toBe("2026-01-01T00:00:00.000Z");
    expect(params.get("before")).toBe("2026-02-01T00:00:00.000Z");
    expect(params.get("done")).toBe("true");
    expect(params.get("kinds")).toBe("A,C");
  });

  it("clears all four in one handler, including an array back to its default", async () => {
    renderAt("?after=2026-01-01T00:00:00.000Z&before=2026-02-01T00:00:00.000Z&done=true&kinds=A,C");
    await click("clear-four");
    expect(screen.getByTestId("search").textContent).toBe("");
  });
});
