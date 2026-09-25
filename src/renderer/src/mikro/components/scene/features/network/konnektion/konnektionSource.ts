import type { MikroClient } from "@/lib/zarr/store/types";
import type { KonnektionStoreFragment } from "@/mikro/api/graphql";
import { buildS3FetchConfig, getGeneralAccess } from "@/mikro/lib/zarr/access";
import { S3ParquetStore } from "@/mikro/components/scene/platform/parquet/s3ParquetStore";
import { KonnektionCollection } from "./konnektionCollection";

/**
 * From an API `NetworkCollection` node to an open konnektion collection.
 *
 * The only file that knows how the API describes a collection, so a schema
 * change lands here and nowhere else. The exact role `fabriksSource.ts` plays
 * for meshes.
 *
 * A collection names ONE store: a prefix holding `konnektion.json`, both
 * catalogs and every octree level, with a single grant covering all of it.
 *
 * The grant is `kind: "konnektion"`, and that is not a formality — the three
 * datalayer kinds issue separate credentials, and **a konnektion prefix cannot
 * be read with a fabriks grant.**
 */

export type KonnektionCollectionRef = {
  id: string;
  store: KonnektionStoreFragment;
};

/**
 * Open a collection for reading.
 *
 * **No S3 round trip.** The server read `konnektion.json` at registration and
 * mirrors it onto the store node, so the grid, the encoding and every file's
 * byte length are already in hand — and the byte lengths are the one thing a
 * reader cannot otherwise discover, since a Parquet footer sits at the end of
 * a file and the transport speaks get/get-range only.
 *
 * The mirrored object is still validated like any manifest: a server that
 * mirrors something this reader cannot read is refused rather than trusted.
 * That matters more here than it looks — the GraphQL scalars are `JSON`/`Any`,
 * which codegen lands as `any`, so `parseKonnektionManifest` is the only thing
 * standing between the wire and the decoder.
 *
 * When the mirror is absent — an older server, or a store registered before the
 * fields existed — this falls back to fetching the manifest itself.
 */
export async function openNetworkCollection(
  collection: KonnektionCollectionRef,
  client: MikroClient,
  datalayer: string,
): Promise<KonnektionCollection> {
  const node = collection.store;
  const grant = await getGeneralAccess(client, { kind: "konnektion" });

  const descriptor = { key: node.key, storeId: node.id };
  const store = new S3ParquetStore({
    config: buildS3FetchConfig(grant, descriptor, datalayer),
    // A viewer left open outlives its credentials; rotation goes through the
    // shared provider, so every konnektion store re-credentials on ONE mutation.
    refreshConfig: async (options) =>
      buildS3FetchConfig(
        await getGeneralAccess(client, { ...options, kind: "konnektion" }),
        descriptor,
        datalayer,
      ),
  });

  const mirrored = mirroredManifest(node);
  if (mirrored) return KonnektionCollection.fromMirroredManifest(mirrored, store);

  console.warn(
    `[konnektion] store ${node.id} mirrors no manifest; reading konnektion.json from the prefix instead.`,
  );
  return KonnektionCollection.open(store);
}

/**
 * The manifest as the API mirrors it, or null when the server did not.
 *
 * The mirrored fields are `konnektion.json` verbatim, field for field, so they
 * are reassembled rather than converted. `files` is the load-bearing one —
 * without it there is nothing to read — so its absence alone sends us to the
 * prefix.
 */
function mirroredManifest(node: KonnektionStoreFragment): Record<string, unknown> | null {
  if (!node.specVersion || !node.grid || !node.encoding || !node.files) return null;
  return {
    specVersion: node.specVersion,
    grid: node.grid,
    encoding: node.encoding,
    // Absent mirrors as none, exactly as an absent manifest key does — a store
    // filled before attributes existed declares the same thing either way.
    attributes: node.attributes ?? [],
    counts: node.counts ?? {},
    files: node.files,
  };
}

// The store's axis-order declaration is read by the placement module
// (`platform/model/collectionPlacement.ts` `collectionAxisOrder`), which stays
// free of this file's transitive Arkitekt/zarr imports so placement is testable.
