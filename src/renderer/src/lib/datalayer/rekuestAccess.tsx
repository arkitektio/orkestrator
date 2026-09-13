import {  MediaAccessGrantFragment, MediaStoreFragment, RequestMediaAccessDocument, RequestMediaAccessInput, RequestMediaAccessMutation, RequestMediaAccessMutationVariables } from "@/rekuest/api/graphql";
import { grantExpiresAt, presignS3Url } from "./s3request";
import { ApolloClient } from "@apollo/client";
import { useDatalayerEndpoint, useRekuest } from "@/app/Arkitekt";
import React from "react";

/** A grant plus the absolute expiry derived from its `expiresIn` — computed
 * once on arrival so the presign memo (keyed on it) stays stable. */
export type RekuestMediaCredentials = MediaAccessGrantFragment & { expiresAt: number };

const CREDENTIAL_REFRESH_SKEW_MS = 60_000;

// Rekuest grants are PER STORE (the mutation takes a `storeId` and answers
// with that object's key), so they are cached per store id rather than once
// globally. Without this every mount of a placement model ran the mutation
// again and — since each grant carries a fresh session token — presigned to a
// different URL, defeating both the presign memo and the HTTP cache.
const grantCache = new Map<string, Promise<RekuestMediaCredentials>>();

const getCredentials = (media: MediaStoreFragment, client: ApolloClient<any>): Promise<RekuestMediaCredentials> => {
  const cached = grantCache.get(media.id);
  if (cached) return cached;

  const request = client.mutate<RequestMediaAccessMutation, RequestMediaAccessMutationVariables>({
    mutation: RequestMediaAccessDocument,
    variables: {
      input: { storeId: media.id } as RequestMediaAccessInput
    }
  }).then(({ data }) => {
    const grant = data?.requestMediaAccess;
    if (!grant) {
      throw new Error("Failed to get media access credentials");
    }
    const credentials: RekuestMediaCredentials = { ...grant, expiresAt: grantExpiresAt(grant) };
    // Drop the entry shortly before the grant dies so the next mount re-mints.
    const ttl = Math.max(0, credentials.expiresAt - CREDENTIAL_REFRESH_SKEW_MS - Date.now());
    setTimeout(() => {
      if (grantCache.get(media.id) === request) grantCache.delete(media.id);
    }, ttl);
    return credentials;
  }).catch((error) => {
    // Do not cache failures: the next call retries.
    if (grantCache.get(media.id) === request) grantCache.delete(media.id);
    throw error;
  });

  grantCache.set(media.id, request);
  return request;
};

/**
 * A presigned URL for the object `credentials` grant access to. Plain https,
 * loadable by three.js loaders directly; memoized by the signer per
 * (credential, UTC hour, object), so `useGLTF`'s own URL-keyed cache also
 * hits across remounts.
 */
export const createMediaUrl = (_media: MediaStoreFragment, datalayer: string, credentials: RekuestMediaCredentials) =>
  presignS3Url(datalayer + "/" + credentials.bucket + "/" + credentials.key, credentials);

/** `createMediaUrl` with the grant fetched (and cached per store) via `client`. */
export const getRekuestMediaUrl = async (media: MediaStoreFragment, client: ApolloClient<any>, datalayer: string): Promise<string> => {
  const credentials = await getCredentials(media, client);
  return createMediaUrl(media, datalayer, credentials);
};

/**
 * Blob path: pulls the WHOLE object into memory and wraps it in an object
 * URL. Only for a consumer that genuinely needs the bytes — models rendered
 * through `useGLTF` should use `createMediaUrl`. The caller owns the returned
 * URL and must `URL.revokeObjectURL` it.
 */
export const createBlobUrl = async (media: MediaStoreFragment, datalayer: string, credentials: RekuestMediaCredentials) => {
  const response = await fetch(await createMediaUrl(media, datalayer, credentials), { method: "GET" });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/** `createBlobUrl` with the grant fetched (and cached per store) via `client`. */
export const createBlobedUrl = async (media: MediaStoreFragment, client: ApolloClient<any>, datalayer: string) => {
  const credentials = await getCredentials(media, client);
  return await createBlobUrl(media, datalayer, credentials);
};

export const WithMediaUrl = (props: { children: (url: string) => React.ReactNode, media?: MediaStoreFragment | undefined | null }) => {

  const endpointUrl = useDatalayerEndpoint();
  const rekuest = useRekuest();

  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!endpointUrl) return;
    if (!props.media) return;

    let isMounted = true;

    getRekuestMediaUrl(props.media, rekuest, endpointUrl)
      .then((mediaUrl) => {
        if (isMounted) setUrl(mediaUrl);
      })
      .catch(err => console.error("Error creating media URL:", err));

    return () => {
      isMounted = false;
      setUrl(null);
    };
  }, [props.media, endpointUrl, rekuest]);

  if (!url) {
    return null;
  }

  return props.children(url);
};
