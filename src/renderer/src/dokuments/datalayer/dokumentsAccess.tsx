import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { grantExpiresAt, presignS3Url } from "@/core/data/s3/s3request";
import { useDokuments } from "@/dokuments/api/funcs";
import {
  MediaAccessGrantFragment,
  MediaStoreFragment,
  RequestMediaAccessDocument,
  RequestMediaAccessMutation,
  RequestMediaAccessMutationVariables,
} from "@/dokuments/api/graphql";
import { ApolloClient } from "@apollo/client";
import React from "react";

type DokumentsMediaCredentials = MediaAccessGrantFragment & { expiresAt: number };

const CREDENTIAL_REFRESH_SKEW_MS = 60_000;

// Grants are per store (`requestMediaAccess` takes a `storeId`), so they are
// cached per store id; a fresh grant per mount would presign to a new URL
// each time and defeat the HTTP cache.
const grantCache = new Map<string, Promise<DokumentsMediaCredentials>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCredentials = (store: MediaStoreFragment, client: ApolloClient<any>): Promise<DokumentsMediaCredentials> => {
  const cached = grantCache.get(store.id);
  if (cached) return cached;

  const request = client
    .mutate<RequestMediaAccessMutation, RequestMediaAccessMutationVariables>({
      mutation: RequestMediaAccessDocument,
      variables: { input: { storeId: store.id } },
    })
    .then(({ data }) => {
      const grant = data?.requestMediaAccess;
      if (!grant) throw new Error("Failed to get read credentials for the file");
      const credentials: DokumentsMediaCredentials = { ...grant, expiresAt: grantExpiresAt(grant) };
      const ttl = Math.max(0, credentials.expiresAt - CREDENTIAL_REFRESH_SKEW_MS - Date.now());
      setTimeout(() => {
        if (grantCache.get(store.id) === request) grantCache.delete(store.id);
      }, ttl);
      return credentials;
    })
    .catch((error) => {
      if (grantCache.get(store.id) === request) grantCache.delete(store.id);
      throw error;
    });

  grantCache.set(store.id, request);
  return request;
};

/** A presigned URL for `store`, signed client-side from its read grant. */
export const getDokumentsMediaUrl = async (
  store: MediaStoreFragment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>,
  datalayer: string,
): Promise<string> => {
  const credentials = await getCredentials(store, client);
  return presignS3Url(datalayer + "/" + credentials.bucket + "/" + credentials.key, credentials);
};

/** The URL of `store`, or undefined until it is signed (or when there is none). */
export const useDokumentsMediaUrl = (store: MediaStoreFragment | null | undefined): string | undefined => {
  const client = useDokuments();
  const datalayer = useDatalayerEndpoint();
  const [url, setUrl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setUrl(undefined);
    if (!store || !datalayer) return;
    let cancelled = false;
    getDokumentsMediaUrl(store, client, datalayer)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch((error) => console.error("Error signing a dokuments file URL:", error));
    return () => {
      cancelled = true;
    };
  }, [store, client, datalayer]);

  return url;
};

/** An `<img>` of `store`, shown once its URL is signed; `fallback` until then or without one. */
export const DokumentsImage = ({
  store,
  fallback = null,
  ...props
}: { store: MediaStoreFragment | null | undefined; fallback?: React.ReactNode } & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">) => {
  const url = useDokumentsMediaUrl(store);
  return url ? <img src={url} {...props} /> : <>{fallback}</>;
};
