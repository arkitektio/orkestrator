import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Alias } from "../fakts/faktsSchema";
import type { Link } from "./link";
import { createSupervisor, NETWORK_SETTLE_MS, SUSPECT_INTERVAL_MS } from "./supervisor";

const A: Alias = { id: "a", host: "a.example.org", ssl: true, challenge: "ht" };
const up = (failures = 0): Link => ({ phase: "up", alias: A, verifiedAt: 0, rechecking: false, failures });
const down = (at: number, attempts = 1): Link => ({ phase: "down", reason: "x", since: 0, at, attempts, rechecking: false });

let links: Record<string, Link>;
let checked: string[][];
let visible: boolean;
let becameVisible: () => void;

const supervisor = (onMesh: (key: string) => boolean = () => false) =>
  createSupervisor({
    links: () => links,
    check: (keys) => checked.push(keys),
    onMesh,
    visible: () => visible,
    onVisible: (listener) => {
      becameVisible = listener;
      return () => {};
    },
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  links = {};
  checked = [];
  visible = true;
});
afterEach(() => vi.useRealTimers());

describe("a network change", () => {
  it("checks every service that has been checked, once, after a burst settled", () => {
    links = { mikro: up(), rekuest: down(0), kraph: { phase: "idle" }, fluss: { phase: "probing", since: 0, attempts: 0 } };
    const s = supervisor();
    s.networkChanged();
    vi.advanceTimersByTime(NETWORK_SETTLE_MS - 1);
    s.networkChanged();
    vi.advanceTimersByTime(NETWORK_SETTLE_MS - 1);
    expect(checked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(checked).toEqual([["mikro", "rekuest"]]);
  });
});

describe("the mesh", () => {
  it("checks what is down when it comes up, and what ran through it when it stops", () => {
    links = { mikro: up(), rekuest: up(), kraph: down(0) };
    const s = supervisor((key) => key === "rekuest");
    s.meshUp();
    s.meshDown();
    expect(checked).toEqual([["kraph"], ["rekuest"]]);
  });
});

describe("a client that keeps failing", () => {
  it("is checked once it is suspect, and not again right away", () => {
    links = { mikro: up(1) };
    const s = supervisor();
    s.networkError("mikro");
    expect(checked).toEqual([]);
    links = { mikro: up(2) };
    s.networkError("mikro");
    s.networkError("mikro");
    expect(checked).toEqual([["mikro"]]);
    vi.advanceTimersByTime(SUSPECT_INTERVAL_MS);
    s.networkError("mikro");
    expect(checked).toEqual([["mikro"], ["mikro"]]);
  });
});

describe("a service that is down", () => {
  it("is checked again when its backoff has run out", () => {
    links = { mikro: down(0, 1), rekuest: down(0, 3) };
    const s = supervisor();
    s.linksChanged();
    vi.advanceTimersByTime(4_999);
    expect(checked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(checked).toEqual([["mikro"]]);
    // The controller marks it as being checked; nothing more is due until 20 s.
    links = { ...links, mikro: { ...down(0, 1), rechecking: true } };
    s.linksChanged();
    vi.advanceTimersByTime(15_000);
    expect(checked).toEqual([["mikro"], ["rekuest"]]);
  });

  it("is left alone while the window is hidden, and picked up when it shows again", () => {
    links = { mikro: down(0) };
    visible = false;
    const s = supervisor();
    s.linksChanged();
    vi.advanceTimersByTime(60_000);
    expect(checked).toEqual([]);
    visible = true;
    becameVisible();
    vi.advanceTimersByTime(0);
    expect(checked).toEqual([["mikro"]]);
  });

  it("stops when it is disposed", () => {
    links = { mikro: down(0) };
    const s = supervisor();
    s.linksChanged();
    s.networkChanged();
    s.dispose();
    vi.advanceTimersByTime(60_000);
    s.meshUp();
    expect(checked).toEqual([]);
  });
});
