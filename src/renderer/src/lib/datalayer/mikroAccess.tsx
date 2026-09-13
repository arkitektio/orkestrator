import { grantExpiresAt, presignS3Url } from "./s3request";
import { ApolloClient } from "@apollo/client";
import { useDatalayerEndpoint, useMikro } from "@/app/Arkitekt";
import React from "react";
import { useNearViewport } from "./useNearViewport";
import { GeneralMediaAccessGrantFragment, MediaStoreFragment, RequestGeneralMediaAccessDocument, RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables } from "@/mikro-next/api/graphql";

/** A grant plus the absolute expiry derived from its `expiresIn` — computed
 * once on arrival so the presign memo (keyed on it) stays stable. */
export type MikroMediaCredentials = GeneralMediaAccessGrantFragment & { expiresAt: number };

/** Refresh the grant this far before it expires, so a URL minted at the very
 * end of its life still has time to be fetched. */
const CREDENTIAL_REFRESH_SKEW_MS = 60_000;

// --- Caching & Lock Mechanism ---
let cachedCredentialsPromise: Promise<MikroMediaCredentials> | null = null;
let cachedCredentials: MikroMediaCredentials | null = null;

const getCredentials = async (client: ApolloClient<any>): Promise<MikroMediaCredentials> => {
  const now = Date.now();

  // 1. Return valid cached credentials
  if (cachedCredentials && now < cachedCredentials.expiresAt - CREDENTIAL_REFRESH_SKEW_MS) {
    return cachedCredentials;
  }

  // 2. If a request is already in flight, wait for it to finish (The Lock)
  if (cachedCredentialsPromise) {
    return cachedCredentialsPromise;
  }

  // 3. Initiate a new request and store the promise lock
  cachedCredentialsPromise = client.mutate<RequestGeneralMediaAccessMutation, RequestGeneralMediaAccessMutationVariables>({
    mutation: RequestGeneralMediaAccessDocument,
    variables: {
      input: {}
    }
  }).then(({ data }) => {
    const grant = data?.requestGeneralMediaAccess;

    if (!grant) {
      throw new Error("Failed to get media access credentials");
    }

    const credentials: MikroMediaCredentials = { ...grant, expiresAt: grantExpiresAt(grant) };
    cachedCredentials = credentials;
    return credentials;
  }).catch((err) => {
    // Clear cache on error so subsequent attempts can retry cleanly
    cachedCredentials = null;
    throw err;
  }).finally(() => {
    // Clear the promise lock once resolved or rejected
    cachedCredentialsPromise = null;
  });

  return cachedCredentialsPromise;
};

const mediaObjectUrl = (media: MediaStoreFragment, datalayer: string, credentials: MikroMediaCredentials) =>
  datalayer + "/" + credentials.bucket + "/" + media.key;

/**
 * A presigned URL for `media` — what `<img src>` should be handed. Memoized
 * by the signer per (credential, UTC hour, object), so repeated mounts of the
 * same snapshot cost a Map lookup, and the URL itself is a stable HTTP cache
 * key: Chromium fetches the object once and serves every later card from its
 * cache. Nothing to revoke.
 */
export const createMediaUrl = (media: MediaStoreFragment, datalayer: string, credentials: MikroMediaCredentials) =>
  presignS3Url(mediaObjectUrl(media, datalayer, credentials), credentials);

/** `createMediaUrl` with the grant fetched (and cached) via `client`. */
export const getMikroMediaUrl = async (
  media: MediaStoreFragment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>,
  datalayer: string,
): Promise<string> => {
  const credentials = await getCredentials(client);
  return createMediaUrl(media, datalayer, credentials);
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
export const createBlobedUrl = async (media: MediaStoreFragment, client: ApolloClient<any>, datalayer: string) => {
  const credentials = await getCredentials(client);
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

  const sentinelRef = React.useRef<HTMLSpanElement | null>(null);
  const near = useNearViewport(sentinelRef);
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!endpointUrl) return;
    if (!props.media) return;
    if (!near) return;

    let isMounted = true;

    getMikroMediaUrl(props.media, mikro, endpointUrl)
      .then((mediaUrl) => {
        if (isMounted) setUrl(mediaUrl);
      })
      .catch((err) => console.error("Error creating media URL:", err));

    return () => {
      isMounted = false;
      setUrl(null);
    };
  }, [props.media, endpointUrl, mikro, near]);

  if (!url) {
    // Zero-size sentinel: lets the viewport observer decide when to fetch.
    return <span ref={sentinelRef} aria-hidden className="absolute inset-0 pointer-events-none" />;
  }

  return props.children(url);
};
