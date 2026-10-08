import { describe, expect, it } from "vitest";

import { marchField, meshToField, subtractCapsule, unionMesh } from "../field/sculptField";
import { applyStamp, capsuleChainStamp, sphereStamp, stampFromSpec, stampToField, type StampSpec } from "../field/stamps";
import { finishDesignGeometry } from "../ops/postProcess";
import { createSyncDesignDispatcher, createWorkerDesignDispatcher } from "./designDispatcher";
import type { DesignWorkerRequest } from "./design-worker";
import { resultTransfers, runDesignJob, vertexNormals, type DesignJob } from "./designJob";

// No polish, generous detail: the pipeline's SHAPE is under test.
const finish = { marcher: "cubes" as const, polishIterations: 0, detailWorld: 0.5 };
const ball: StampSpec = { kind: "sphere", center: [0, 0, 0], radius: 4 };

describe("runDesignJob", () => {
  it("a stamp base is the stamp's own field, marched and finished", async () => {
    const result = await runDesignJob({ base: { kind: "stamp", spec: ball, spacing: 0.5 }, ops: [], finish });
    const field = stampToField(sphereStamp([0, 0, 0], 4), 0.5);
    expect(Array.from(result.field.data)).toEqual(Array.from(field.data));
    const expected = await finishDesignGeometry(marchField(field, "cubes"), finish);
    expect(Array.from(result.current.positions)).toEqual(Array.from(expected.current.positions));
    expect(result.changed).toBe(false); // no op touched the base
    expect(result.current.normals).toHaveLength(result.current.positions.length);
  });

  it("applies each op exactly as the in-thread field functions do", async () => {
    const base = stampToField(sphereStamp([0, 0, 0], 4), 0.5);
    const piece = marchField(stampToField(sphereStamp([5, 0, 0], 3), 0.5), "cubes");
    const chain: StampSpec = { kind: "capsuleChain", points: [[0, 0, 0], [0, 8, 0]], radius: 1.5 };
    const result = await runDesignJob({
      base: { kind: "field", field: base },
      ops: [
        { type: "unionMesh", geometry: piece },
        { type: "stamp", mode: "add", spec: chain },
        { type: "subtractCapsule", stroke: [[-6, 0, 0], [6, 0, 0]], radius: 1 },
      ],
      finish,
    });
    let expected = unionMesh(base, piece);
    expected = applyStamp(expected, capsuleChainStamp([[0, 0, 0], [0, 8, 0]], 1.5), "add");
    expected = subtractCapsule(expected, [[-6, 0, 0], [6, 0, 0]], 1);
    expect(result.field.size).toEqual(expected.size);
    expect(Array.from(result.field.data)).toEqual(Array.from(expected.data));
    expect(result.changed).toBe(true);
  });

  it("voxelizes a mesh base, and unions a field like a mesh", async () => {
    const mesh = marchField(stampToField(sphereStamp([0, 0, 0], 4), 0.5), "cubes");
    const other = stampToField(sphereStamp([6, 0, 0], 3), 0.5);
    const result = await runDesignJob({
      base: { kind: "mesh", geometry: mesh, spacing: 0.5 },
      ops: [{ type: "unionField", field: other }],
      finish,
    });
    const expected = unionMesh(meshToField(mesh, 0.5), marchField(other, "cubes"));
    expect(Array.from(result.field.data)).toEqual(Array.from(expected.data));
  });

  it("skips the march for an edit that changed nothing, when asked", async () => {
    const base = stampToField(sphereStamp([0, 0, 0], 4), 0.5);
    const missed: DesignJob = {
      base: { kind: "field", field: base },
      ops: [{ type: "subtractCapsule", stroke: [[40, 40, 40], [44, 40, 40]], radius: 1 }],
      finish,
      skipUnchanged: true,
    };
    const result = await runDesignJob(missed);
    expect(result.changed).toBe(false);
    expect(result.current.indices).toHaveLength(0);
    // Without the flag the unchanged field is still marched.
    const marched = await runDesignJob({ ...missed, skipUnchanged: false });
    expect(marched.current.indices.length).toBeGreaterThan(0);
  });

  it("every stamp spec builds the stamp its constructor does", () => {
    const point = [1.5, -0.5, 2] as const;
    expect(stampFromSpec(ball).sdf(...point)).toBe(sphereStamp([0, 0, 0], 4).sdf(...point));
    for (const spec of [
      { kind: "box", center: [0, 0, 0], halfExtents: [1, 2, 3] },
      { kind: "ellipsoid", center: [0, 0, 0], radii: [1, 2, 3] },
      { kind: "orientedEllipsoid", center: [0, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], radii: [1, 2, 3] },
      { kind: "taperedChain", points: [[0, 0, 0], [4, 0, 0]], radii: [1, 2] },
      { kind: "halfspace", normal: [0, 0, 1], distance: 1 },
    ] as StampSpec[]) {
      expect(Number.isFinite(stampFromSpec(spec).sdf(...point))).toBe(true);
    }
  });

  it("normals point outward on a sphere, and the transfer list names each buffer once", async () => {
    const result = await runDesignJob({ base: { kind: "stamp", spec: ball, spacing: 0.5 }, ops: [], finish });
    const { positions } = result.current;
    const normals = vertexNormals(result.current);
    let outward = 0;
    for (let v = 0; v < positions.length; v += 3) {
      if (positions[v] * normals[v] + positions[v + 1] * normals[v + 1] + positions[v + 2] * normals[v + 2] > 0) outward += 1;
    }
    expect(outward).toBe(positions.length / 3);
    const transfers = resultTransfers({ ...result, original: result.current });
    expect(new Set(transfers).size).toBe(transfers.length);
  });
});

describe("design dispatcher", () => {
  const job: DesignJob = { base: { kind: "stamp", spec: ball, spacing: 1 }, ops: [], finish };

  /** A worker that answers each job with `runDesignJob`, a task later. */
  const fakeWorker = () => {
    const posted: number[] = [];
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null,
      postMessage(message: DesignWorkerRequest) {
        posted.push(message.id);
        void runDesignJob(message.job).then((result) =>
          setTimeout(() => worker.onmessage?.({ data: { id: message.id, result } } as MessageEvent), 0),
        );
      },
      terminate() {},
    };
    return { worker: worker as unknown as Worker, posted };
  };

  it("the same-thread dispatcher runs the job, unless it is already superseded", async () => {
    const dispatcher = createSyncDesignDispatcher();
    expect((await dispatcher.run(job))?.current.indices.length).toBeGreaterThan(0);
    expect(await dispatcher.run(job, { superseded: () => true })).toBeNull();
  });

  it("runs one job at a time, in order, and drops a queued job nobody wants", async () => {
    const { worker, posted } = fakeWorker();
    const dispatcher = createWorkerDesignDispatcher(() => worker);
    let unwanted = false;
    const first = dispatcher.run(job);
    const second = dispatcher.run(job, { superseded: () => unwanted });
    const third = dispatcher.run(job);
    expect(posted).toEqual([1]); // the others wait their turn
    unwanted = true;
    expect((await first)?.current.indices.length).toBeGreaterThan(0);
    expect(await second).toBeNull();
    expect((await third)?.current.indices.length).toBeGreaterThan(0);
    expect(posted).toEqual([1, 3]); // the withdrawn job never reached the worker
  });

  it("falls back to the same thread when no worker can be made", async () => {
    const dispatcher = createWorkerDesignDispatcher(() => {
      throw new Error("no workers here");
    });
    expect((await dispatcher.run(job))?.current.indices.length).toBeGreaterThan(0);
    expect((await dispatcher.run(job))?.current.indices.length).toBeGreaterThan(0);
  });
});
