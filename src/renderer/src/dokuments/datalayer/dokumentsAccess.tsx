import { Arkitekt, mediaGrantKey, sharedGrant, useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { presignS3Url, stampGrant } from "@/core/data/s3/s3request";
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

type DokumentsMediaCredentials = MediaAccessGrantFragment & { signedAt: number; expiresAt: number };

// Grants are per store (`requestMediaAccess` takes a `storeId`), so they are
// shared per store id, across windows and launches (`sharedGrant`); a fresh
// grant per mount would presign to a new URL each time and defeat the HTTP
// cache. No profile: this window only.
const getCredentials = (
  store: MediaStoreFragment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null,
): Promise<DokumentsMediaCredentials> =>
  sharedGrant(
    mediaGrantKey("dokuments", profileId ?? "", datalayer, `store:${store.id}`),
    async () => {
      const { data } = await client.mutate<RequestMediaAccessMutation, RequestMediaAccessMutationVariables>({
        mutation: RequestMediaAccessDocument,
        variables: { input: { storeId: store.id } },
      });
      const grant = data?.requestMediaAccess;
      if (!grant) throw new Error("Failed to get read credentials for the file");
      return stampGrant(grant);
    },
    { share: profileId !== null },
  );

/** A presigned URL for `store`, signed client-side from its read grant. */
export const getDokumentsMediaUrl = async (
  store: MediaStoreFragment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null = null,
): Promise<string> => {
  const credentials = await getCredentials(store, client, datalayer, profileId);
  return presignS3Url(datalayer + "/" + credentials.bucket + "/" + credentials.key, credentials);
};

/** The URL of `store`, or undefined until it is signed (or when there is none). */
export const useDokumentsMediaUrl = (store: MediaStoreFragment | null | undefined): string | undefined => {
  const client = useDokuments();
  const datalayer = useDatalayerEndpoint();
  const profileId = Arkitekt.useActiveProfileId();
  const [url, setUrl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setUrl(undefined);
    if (!store || !datalayer) return;
    let cancelled = false;
    getDokumentsMediaUrl(store, client, datalayer, profileId)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch((error) => console.error("Error signing a dokuments file URL:", error));
    return () => {
      cancelled = true;
    };
  }, [store, client, datalayer, profileId]);

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
