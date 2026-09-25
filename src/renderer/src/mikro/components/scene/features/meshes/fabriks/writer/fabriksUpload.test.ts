// @vitest-environment jsdom
// (importing the generated `graphql.ts` documents pulls in the Apollo hooks
// barrel, which touches `window` on load)
import { beforeEach, describe, expect, it, vi } from "vitest";

const awsFetch = vi.fn();

vi.mock("aws4fetch", () => ({
  AwsClient: class {
    fetch = awsFetch;
  },
}));

import { FinishFabriksUploadDocument, RequestFabriksUploadDocument } from "@/mikro/api/graphql";
import type { MikroClient } from "@/lib/zarr/store/types";
import { FabriksUploadError, uploadFabriksPrefix } from "./fabriksUpload";

const GRANT = {
  accessKey: "AK",
  secretKey: "SK",
  sessionToken: "TOKEN",
  path: "fabriks/abc",
  key: "fabriks/abc/",
  bucket: "meshes",
  region: "us-east-1",
  expiresIn: 3600,
  maxBytes: 1_000_000,
  store: "store-1",
};

const makeClient = (overrides: { grant?: unknown } = {}) => {
  const calls: { mutation: unknown; variables: unknown }[] = [];
  const client = {
    mutate: vi.fn(async ({ mutation, variables }) => {
      calls.push({ mutation, variables });
      if (mutation === RequestFabriksUploadDocument) {
        return { data: { requestFabriksUpload: "grant" in overrides ? overrides.grant : GRANT } };
      }
      if (mutation === FinishFabriksUploadDocument) {
        return { data: { finishFabriksUpload: { id: "store-1", key: GRANT.key, bucket: GRANT.bucket } } };
      }
      throw new Error("unexpected mutation");
    }),
  } as unknown as MikroClient;
  return { client, calls };
};

const prefix = () =>
  new Map<string, Uint8Array>([
    ["fabriks.json", new Uint8Array(3)],
    ["level=0/part-00000.parquet", new Uint8Array(100)],
    ["catalog/cells.parquet", new Uint8Array(20)],
    ["catalog/objects.parquet", new Uint8Array(10)],
  ]);

const putUrls = () => awsFetch.mock.calls.map(([url]) => url as string);

beforeEach(() => {
  awsFetch.mockReset();
  awsFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
});

describe("uploadFabriksPrefix", () => {
  it("PUTs every file under the grant's prefix, the manifest last, then finishes", async () => {
    const { client, calls } = makeClient();
    const id = await uploadFabriksPrefix(client, "http://minio:9000/", prefix(), { parallelism: 2 });
    expect(id).toBe("store-1");
    const urls = putUrls();
    expect(urls).toHaveLength(4);
    expect(urls.at(-1)).toBe("http://minio:9000/meshes/fabriks/abc/fabriks.json");
    expect(urls).toContain("http://minio:9000/meshes/fabriks/abc/level=0/part-00000.parquet");
    expect(calls.at(-1)).toMatchObject({
      mutation: FinishFabriksUploadDocument,
      variables: { input: { storeId: "store-1", valid: true } },
    });
  });

  it("reports progress per file, in bytes and counts", async () => {
    const { client } = makeClient();
    const seen: number[] = [];
    await uploadFabriksPrefix(client, "http://minio:9000", prefix(), {
      onProgress: (p) => seen.push(p.bytesDone),
    });
    expect(seen.at(-1)).toBe(133);
    expect(seen).toHaveLength(4);
  });

  it("does not finish, and never PUTs the manifest, when a file fails", async () => {
    awsFetch.mockImplementation(async (url: string) =>
      url.endsWith("cells.parquet")
        ? { ok: false, status: 403, statusText: "Forbidden" }
        : { ok: true, status: 200, statusText: "OK" },
    );
    const { client, calls } = makeClient();
    await expect(uploadFabriksPrefix(client, "http://minio:9000", prefix(), { parallelism: 1 })).rejects.toThrow(
      FabriksUploadError,
    );
    expect(putUrls().some((url) => url.endsWith("fabriks.json"))).toBe(false);
    expect(calls.some((c) => c.mutation === FinishFabriksUploadDocument)).toBe(false);
  });

  it("refuses a prefix over the grant's byte cap before uploading anything", async () => {
    const { client } = makeClient({ grant: { ...GRANT, maxBytes: 50 } });
    await expect(uploadFabriksPrefix(client, "http://minio:9000", prefix())).rejects.toThrow(/over the datalayer/);
    expect(awsFetch).not.toHaveBeenCalled();
  });

  it("refuses a prefix without a manifest", async () => {
    const { client } = makeClient();
    const files = prefix();
    files.delete("fabriks.json");
    await expect(uploadFabriksPrefix(client, "http://minio:9000", files)).rejects.toThrow(/no fabriks.json/);
  });
});
