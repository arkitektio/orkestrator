import { presignS3Url, stampGrant } from "@/core/data/s3/s3request";
import { ApolloClient } from "@apollo/client";
import { Arkitekt, mediaGrantKey, sharedGrant, useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { useMikro } from "@/mikro/api/funcs";
import React from "react";
import { useNearViewport } from "@/core/data/s3/useNearViewport";
import { GeneralMediaAccessGrantFragment, KulisseStoreFragment, MediaStoreFragment, RequestGeneralMediaAccessDocument, RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables, RequestKulisseAccessDocument, RequestKulisseAccessMutation, RequestKulisseAccessMutationVariables } from "@/mikro/api/graphql";

/** A grant plus its issue time and absolute expiry — stamped once on arrival,
 * so the presign memo (keyed on both) and the URLs it mints stay stable. */
export type MikroMediaCredentials = GeneralMediaAccessGrantFragment & { signedAt: number; expiresAt: number };

const mintCredentials = async (client: ApolloClient<any>): Promise<MikroMediaCredentials> => {
  const { data } = await client.mutate<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>({
    mutation: RequestGeneralMediaAccessDocument,
    variables: {
      input: {}
    }
  });
  const grant = data?.requestGeneralMediaAccess;
  if (!grant) {
    throw new Error("Failed to get media access credentials");
  }
  return stampGrant(grant);
};

/**
 * The profile's media grant on `datalayer`, shared by every window and kept
 * across launches until it expires (`sharedGrant` in the connection runtime). One grant
 * means one URL per snapshot, which is what lets Chromium's cache answer a
 * second window or the next launch instead of the network.
 */
const getCredentials = (
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null,
): Promise<MikroMediaCredentials> =>
  // No profile to scope storage by (none active): this window only.
  sharedGrant(mediaGrantKey("mikro", profileId ?? "", datalayer), () => mintCredentials(client), {
    share: profileId !== null,
  });

const mediaObjectUrl = (media: MediaStoreFragment, datalayer: string, credentials: MikroMediaCredentials) =>
  datalayer + "/" + credentials.bucket + "/" + media.key;

/**
 * A presigned URL for `media` — what `<img src>` should be handed. Memoized
 * by the signer per (credential, issue time, object), so repeated mounts of
 * the same snapshot cost a Map lookup, and the URL itself is a stable HTTP
 * cache key for the grant's whole life: Chromium fetches the object once and
 * serves every later card, window and launch from its cache. Nothing to
 * revoke.
 */
export const createMediaUrl = (media: MediaStoreFragment, datalayer: string, credentials: MikroMediaCredentials) =>
  presignS3Url(mediaObjectUrl(media, datalayer, credentials), credentials);

/** `createMediaUrl` with the grant fetched (and cached) via `client`. */
export const getMikroMediaUrl = async (
  media: MediaStoreFragment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null = null,
): Promise<string> => {
  const credentials = await getCredentials(client, datalayer, profileId);
  return createMediaUrl(media, datalayer, credentials);
};

/**
 * A URL for a fixture's model, signed from a read grant on its one kulisse
 * store. A grant per call: a model is fetched once and then held by the glTF
 * cache (`lib/fixtures/gltfCache`), so there is nothing to amortize.
 */
export const getMikroKulisseUrl = async (
  store: KulisseStoreFragment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>,
  datalayer: string,
): Promise<string> => {
  const { data } = await client.mutate<RequestKulisseAccessMutation, RequestKulisseAccessMutationVariables>({
    mutation: RequestKulisseAccessDocument,
    variables: { input: { storeId: store.id } },
  });
  const grant = data?.requestKulisseAccess;
  if (!grant) throw new Error("Failed to get read credentials for the model");
  return presignS3Url(datalayer + "/" + grant.bucket + "/" + grant.key, stampGrant(grant));
};

/**
 * Blob path: pulls the WHOLE object into memory and wraps it in an object
 * URL. Only for a consumer that genuinely needs the bytes (a download, a
 * canvas read-back) — an `<img>` should use `createMediaUrl` instead. The
 * caller owns the returned URL and must `URL.revokeObjectURL` it.
 */
export const createBlobUrl = async (media: MediaStoreFragment, datalayer: string, credentials: MikroMediaCredentials) => {
  const response = await fetch(await createMediaUrl(media, datalayer, credentials), { method: "GET" });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/** `createBlobUrl` with the grant fetched (and cached) via `client`. */
export const createBlobedUrl = async (
  media: MediaStoreFragment,
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null = null,
) => {
  const credentials = await getCredentials(client, datalayer, profileId);
  return await createBlobUrl(media, datalayer, credentials);
};

/**
 * Renders `children(url)` with a presigned URL for `media` once the element
 * is near the viewport. The URL is a plain https URL the browser loads (and
 * caches) itself — no blob, nothing held in JS memory, nothing to revoke.
 */
export const WithMikroMediaUrl = (props: { children: (url: string) => React.ReactNode, media?: MediaStoreFragment | undefined | null }) => {
  const endpointUrl = useDatalayerEndpoint();
  const mikro = useMikro();
  const profileId = Arkitekt.useActiveProfileId();

  const sentinelRef = React.useRef<HTMLSpanElement | null>(null);
  const near = useNearViewport(sentinelRef);
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!endpointUrl) return;
    if (!props.media) return;
    if (!near) return;

    let isMounted = true;

    getMikroMediaUrl(props.media, mikro, endpointUrl, profileId)
      .then((mediaUrl) => {
        if (isMounted) setUrl(mediaUrl);
      })
      .catch((err) => console.error("Error creating media URL:", err));

    return () => {
      isMounted = false;
      setUrl(null);
    };
  }, [props.media, endpointUrl, mikro, near, profileId]);

  if (!url) {
    // Zero-size sentinel: lets the viewport observer decide when to fetch.
    return <span ref={sentinelRef} aria-hidden className="absolute inset-0 pointer-events-none" />;
  }

  return props.children(url);
};
