// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const assertEntity = vi.fn();
const refetch = vi.fn(async () => ({}));
const toastError = vi.fn();

vi.mock("@/kraph/api/graphql", () => ({
  InstanceKind: { Entity: "ENTITY", NaturalEvent: "NATURAL_EVENT", ProtocolEvent: "PROTOCOL_EVENT" },
  useKnowledgeForStructureQuery: (o: unknown) => query(o),
  useAssertEntityExistsMutation: () => [assertEntity, { loading: false }],
}));
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

import { useKnowledge } from "./useKnowledge";

const object = { id: "img-1" };
const instance = (id: string, key: string, kind = "ENTITY") => ({
  id,
  kind,
  term: { key, label: null, color: null },
  createdAt: "2026-01-01",
  component: [id],
  sameAs: [],
  drawnIn: [],
  assertion: { id: `a-${id}`, subject: "me", assertedAt: "2026-01-01" },
});

beforeEach(() => {
  query.mockReset();
  assertEntity.mockReset();
  refetch.mockClear();
  toastError.mockReset();
});

describe("useKnowledge", () => {
  it("reads on mount with the tolerant error policy and no write", () => {
    query.mockReturnValue({ data: undefined, loading: true, refetch });
    renderHook(() => useKnowledge("@mikro/file", object));
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { identifier: "@mikro/file", object: "img-1" },
        errorPolicy: "all",
      }),
    );
  });

  it("lists only ENTITY instances as labels", () => {
    query.mockReturnValue({
      data: {
        structureByIdentifier: {
          metrics: [{ id: "m1" }],
          informs: [instance("i1", "AIS"), instance("e1", "Stim", "PROTOCOL_EVENT")],
        },
      },
      loading: false,
      refetch,
    });
    const { result } = renderHook(() => useKnowledge("@mikro/file", object));
    expect(result.current.labels.map((l) => l.term.key)).toEqual(["AIS"]);
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.notKnownYet).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it("treats a not-found on the root field as an ordinary empty state", () => {
    query.mockReturnValue({
      data: undefined,
      loading: false,
      error: { networkError: null, graphQLErrors: [{ message: "gone", path: ["structureByIdentifier"] }] },
      refetch,
    });
    const { result } = renderHook(() => useKnowledge("@mikro/file", object));
    expect(result.current.notKnownYet).toBe(true);
    expect(result.current.failed).toBe(false);
    expect(result.current.labels).toEqual([]);
  });

  it("reports a real failure as failed, not as empty", () => {
    query.mockReturnValue({
      data: undefined,
      loading: false,
      error: { message: "offline", networkError: new Error("offline"), graphQLErrors: [] },
      refetch,
    });
    const { result } = renderHook(() => useKnowledge("@mikro/file", object));
    expect(result.current.failed).toBe(true);
    expect(result.current.notKnownYet).toBe(false);
    expect(result.current.errorMessage).toBe("offline");
  });

  it("claims with the datum as evidence, shows the chip at once, refetches, then clears it", async () => {
    query.mockReturnValue({ data: { structureByIdentifier: { metrics: [], informs: [] } }, loading: false, refetch });
    let resolve!: () => void;
    assertEntity.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { result } = renderHook(() => useKnowledge("@mikro/file", object));

    let claim!: Promise<void>;
    act(() => {
      claim = result.current.claim("  AIS ");
    });
    expect(result.current.pending).toEqual([{ key: "AIS", state: "pending" }]);
    expect(assertEntity).toHaveBeenCalledWith({
      variables: {
        input: { term: "AIS", supportingEvidence: [{ identifier: "@mikro/file", object: "img-1" }] },
      },
    });

    await act(async () => {
      resolve();
      await claim;
    });
    expect(refetch).toHaveBeenCalled();
    await waitFor(() => expect(result.current.pending).toEqual([]));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("marks a rejected claim as failed and toasts once", async () => {
    query.mockReturnValue({ data: { structureByIdentifier: { metrics: [], informs: [] } }, loading: false, refetch });
    assertEntity.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useKnowledge("@mikro/file", object));
    await act(async () => {
      await result.current.claim("AIS");
    });
    expect(result.current.pending).toEqual([{ key: "AIS", state: "failed" }]);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("ignores an empty word", async () => {
    query.mockReturnValue({ data: { structureByIdentifier: { metrics: [], informs: [] } }, loading: false, refetch });
    const { result } = renderHook(() => useKnowledge("@mikro/file", object));
    await act(async () => {
      await result.current.claim("   ");
    });
    expect(assertEntity).not.toHaveBeenCalled();
  });
});
