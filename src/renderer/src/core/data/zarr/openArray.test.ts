import { describe, expect, it } from "vitest";

import { smallArrayShardProbes } from "./openArray";

const sharding = (shardShape: number[], innerChunkShape: number[]) => ({
  shardShape,
  indexShape: shardShape.map((extent, d) => extent / innerChunkShape[d]),
});

describe("smallArrayShardProbes", () => {
  it("names nothing for an unsharded array", () => {
    expect(smallArrayShardProbes([64, 64, 64], undefined)).toEqual([]);
  });

  it("names each shard of a coarse level once, by its first inner chunk", () => {
    // 2 shards along x, 1 along the others; 8 inner chunks per shard axis.
    const probes = smallArrayShardProbes([512, 512, 1024], sharding([512, 512, 512], [64, 64, 64]));
    expect(probes).toEqual([
      [0, 0, 0],
      [0, 0, 8],
    ]);
  });

  it("counts a partial edge shard", () => {
    expect(
      smallArrayShardProbes([100, 600], sharding([512, 512], [64, 64])).map((c) => c.join(",")),
    ).toEqual(["0,0", "0,8"]);
  });

  it("leaves a level of many shards to the plan", () => {
    expect(smallArrayShardProbes([4096, 4096, 4096], sharding([512, 512, 512], [64, 64, 64]))).toEqual(
      [],
    );
  });
});
