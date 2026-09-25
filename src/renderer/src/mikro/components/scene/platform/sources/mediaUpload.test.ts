// @vitest-environment jsdom
// (importing the generated `graphql.ts` documents pulls in the Apollo hooks
// barrel, which touches `window` on load)
import { beforeEach, describe, expect, it, vi } from "vitest";

const awsFetch = vi.fn();
const awsCtor = vi.fn();

vi.mock("aws4fetch", () => ({
  AwsClient: class {
    fetch = awsFetch;
    constructor(config: unknown) {
      awsCtor(config);
    }
  },
}));

import {
  FinishMediaUploadDocument,
  RequestMediaUploadDocument,
} from "@/mikro/api/graphql";
import { MediaUploadError, uploadMediaBlob } from "./mediaUpload";
import type { MikroClient } from "@/lib/zarr/store/types";

const GRANT = {
  accessKey: "AK",
  secretKey: "SK",
  sessionToken: "TOKEN",
  path: "media/pic.png",
  key: "media/pic.png",
  bucket: "media",
  region: "us-east-1",
  expiresIn: 3600,
  maxBytes: 1_000_000,
  store: "store-id-1",
};

/** A client that answers the two mutations, and records what it was asked. */
const makeClient = (overrides: { grant?: unknown; finish?: unknown } = {}) => {
  const calls: { mutation: unknown; variables: unknown }[] = [];
  const client = {
    mutate: vi.fn(async ({ mutation, variables }) => {
      calls.push({ mutation, variables });
      if (mutation === RequestMediaUploadDocument) {
        // `in`, not `??`: a test that overrides the grant to null is asserting
        // the refusal path, and `??` would hand it the happy-path grant.
        return {
          data: { requestMediaUpload: "grant" in overrides ? overrides.grant : GRANT },
        };
      }
      if (mutation === FinishMediaUploadDocument) {
        return {
          data: {
            finishMediaUpload:
              overrides.finish === undefined
                ? { id: "store-id-1", key: GRANT.key, bucket: GRANT.bucket }
                : overrides.finish,
          },
        };
      }
      throw new Error("unexpected mutation");
    }),
  } as unknown as MikroClient;
  return { client, calls };
};

const png = (size = 10) => new Blob([new Uint8Array(size)], { type: "image/png" });

const finishCalls = (calls: { mutation: unknown }[]) =>
  calls.filter((c) => c.mutation === FinishMediaUploadDocument);

beforeEach(() => {
  awsFetch.mockReset();
  awsCtor.mockReset();
  awsFetch.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
});

describe("uploadMediaBlob", () => {
  it("returns the media store id — the ImageFileLike value", async () => {
    const { client } = makeClient();
    await expect(
      uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png"),
    ).resolves.toBe("store-id-1");
  });

  it("signs with the grant's own credentials and region", async () => {
    const { client } = makeClient();
    await uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png");
    expect(awsCtor).toHaveBeenCalledWith({
      accessKeyId: "AK",
      secretAccessKey: "SK",
      sessionToken: "TOKEN",
      service: "s3",
      region: "us-east-1",
    });
  });

  // Path-style, because the datalayer is normally MinIO — not virtual-hosted.
  it("PUTs to the path-style object URL", async () => {
    const { client } = makeClient();
    await uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png");
    const [url, init] = awsFetch.mock.calls[0];
    expect(url).toBe("http://lab/datalayer/media/media/pic.png");
    expect(init.method).toBe("PUT");
    expect(init.headers["Content-Type"]).toBe("image/png");
  });

  it("does not double the slash when the datalayer has a trailing one", async () => {
    const { client } = makeClient();
    await uploadMediaBlob(client, "http://lab/datalayer/", png(), "pic.png");
    expect(awsFetch.mock.calls[0][0]).toBe("http://lab/datalayer/media/media/pic.png");
  });

  it("does not double the slash when the key has a leading one", async () => {
    const { client } = makeClient({ grant: { ...GRANT, key: "/media/pic.png" } });
    await uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png");
    expect(awsFetch.mock.calls[0][0]).toBe("http://lab/datalayer/media/media/pic.png");
  });

  it("tells the datalayer the file's real name, type and size", async () => {
    const { client, calls } = makeClient();
    await uploadMediaBlob(client, "http://lab/datalayer", png(42), "pic.png");
    expect(calls[0].variables).toEqual({
      input: { originalFileName: "pic.png", contentType: "image/png", fileSize: 42 },
    });
  });

  it("promotes the store only after the bytes land", async () => {
    const { client, calls } = makeClient();
    await uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png");
    expect(finishCalls(calls)[0].variables).toEqual({
      input: { storeId: "store-id-1", valid: true },
    });
  });

  // The grant caps the object size; S3 would fail this with an opaque 403.
  it("refuses a blob over the grant's limit without uploading", async () => {
    const { client, calls } = makeClient({ grant: { ...GRANT, maxBytes: 5 } });
    await expect(
      uploadMediaBlob(client, "http://lab/datalayer", png(10), "pic.png"),
    ).rejects.toThrow(MediaUploadError);
    expect(awsFetch).not.toHaveBeenCalled();
    expect(finishCalls(calls)).toHaveLength(0);
  });

  // Not finalizing IS how a failed upload is abandoned — the store row stays
  // invalid rather than pointing at bytes that never arrived.
  it("leaves the store unfinalized when the PUT fails", async () => {
    awsFetch.mockResolvedValue({ ok: false, status: 403, statusText: "Forbidden" });
    const { client, calls } = makeClient();
    await expect(
      uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png"),
    ).rejects.toThrow(/403/);
    expect(finishCalls(calls)).toHaveLength(0);
  });

  it("throws when the datalayer refuses a grant", async () => {
    const { client } = makeClient({ grant: null });
    await expect(
      uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png"),
    ).rejects.toThrow(/refused an upload grant/);
    expect(awsFetch).not.toHaveBeenCalled();
  });

  it("throws when finalizing does not answer with a store", async () => {
    const { client } = makeClient({ finish: null });
    await expect(
      uploadMediaBlob(client, "http://lab/datalayer", png(), "pic.png"),
    ).rejects.toThrow(/would not finalize/);
  });

  it("falls back to a generic content type for a typeless blob", async () => {
    const { client, calls } = makeClient();
    await uploadMediaBlob(client, "http://lab/datalayer", new Blob([new Uint8Array(3)]), "x.bin");
    expect((calls[0].variables as { input: { contentType: string } }).input.contentType).toBe(
      "application/octet-stream",
    );
  });
});
