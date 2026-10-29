import { AssetAccessDocument, AssetAccessQuery, AssetAccessQueryVariables, MediaAccessGrantFragment, MediaStoreFragment, RequestMediaAccessDocument, RequestMediaAccessInput, RequestMediaAccessMutation, RequestMediaAccessMutationVariables } from "@/rekuest/api/graphql";
import { presignS3Url, stampGrant } from "@/core/data/s3/s3request";
import { ApolloClient } from "@apollo/client";
import { Arkitekt, mediaGrantKey, sharedGrant, useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { useRekuest } from "@/rekuest/api/hooks";
import React from "react";

/** A grant plus its issue time and absolute expiry — stamped once on arrival,
 * so the presign memo (keyed on both) and the URLs it mints stay stable. */
export type RekuestMediaCredentials = MediaAccessGrantFragment & { signedAt: number; expiresAt: number };

// Rekuest grants are PER STORE (the mutation takes a `storeId` and answers
// with that object's key), so they are shared per store id. Each grant carries
// a fresh session token and so presigns to a different URL: one grant per
// store, kept across windows and launches (`sharedGrant`), is what lets the
// presign memo and the HTTP cache hit. No profile: this window only.
const getCredentials = (
  media: MediaStoreFragment,
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null,
): Promise<RekuestMediaCredentials> =>
  sharedGrant(
    mediaGrantKey("rekuest", profileId ?? "", datalayer, `store:${media.id}`),
    async () => {
      const { data } = await client.mutate<RequestMediaAccessMutation, RequestMediaAccessMutationVariables>({
        mutation: RequestMediaAccessDocument,
        variables: {
          input: { storeId: media.id } as RequestMediaAccessInput
        }
      });
      const grant = data?.requestMediaAccess;
      if (!grant) {
        throw new Error("Failed to get media access credentials");
      }
      return stampGrant(grant);
    },
    { share: profileId !== null },
  );

/**
 * A presigned URL for the object `credentials` grant access to. Plain https,
 * loadable by three.js loaders directly; memoized by the signer per
 * (credential, issue time, object), so `useGLTF`'s own URL-keyed cache also
 * hits across remounts.
 */
export const createMediaUrl = (_media: MediaStoreFragment, datalayer: string, credentials: RekuestMediaCredentials) =>
  presignS3Url(datalayer + "/" + credentials.bucket + "/" + credentials.key, credentials);

/** `createMediaUrl` with the grant fetched (and cached per store) via `client`. */
export const getRekuestMediaUrl = async (
  media: MediaStoreFragment,
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null = null,
): Promise<string> => {
  const credentials = await getCredentials(media, client, datalayer, profileId);
  return createMediaUrl(media, datalayer, credentials);
};

// An asset's grant comes off its store (`accessGrant`): a kulisse store for a
// model, a media store for an image. Shared per asset ref, as above per store.
type AssetCredentials = Omit<MediaAccessGrantFragment, "__typename"> & { signedAt: number; expiresAt: number };

const getAssetCredentials = (
  ref: string,
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null,
): Promise<AssetCredentials> =>
  sharedGrant(
    mediaGrantKey("rekuest", profileId ?? "", datalayer, `asset:${ref}`),
    async () => {
      const { data } = await client.query<AssetAccessQuery, AssetAccessQueryVariables>({
        query: AssetAccessDocument,
        variables: { ref },
        fetchPolicy: "network-only",
      });
      const grant = data?.asset?.file.accessGrant;
      if (!grant) throw new Error(`No asset ${ref} to read.`);
      const { __typename: _kind, ...fields } = grant;
      return stampGrant(fields);
    },
    { share: profileId !== null },
  );

/** A presigned URL for the file of the asset `ref`, whichever kind of store holds it. */
export const getRekuestAssetUrl = async (
  ref: string,
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null = null,
): Promise<string> => {
  const credentials = await getAssetCredentials(ref, client, datalayer, profileId);
  return presignS3Url(datalayer + "/" + credentials.bucket + "/" + credentials.key, credentials);
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
export const createBlobedUrl = async (
  media: MediaStoreFragment,
  client: ApolloClient<any>,
  datalayer: string,
  profileId: string | null = null,
) => {
  const credentials = await getCredentials(media, client, datalayer, profileId);
  return await createBlobUrl(media, datalayer, credentials);
};

export const WithMediaUrl = (props: { children: (url: string) => React.ReactNode, media?: MediaStoreFragment | undefined | null }) => {

  const endpointUrl = useDatalayerEndpoint();
  const rekuest = useRekuest();
  const profileId = Arkitekt.useActiveProfileId();

  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!endpointUrl) return;
    if (!props.media) return;

    let isMounted = true;

    getRekuestMediaUrl(props.media, rekuest, endpointUrl, profileId)
      .then((mediaUrl) => {
        if (isMounted) setUrl(mediaUrl);
      })
      .catch(err => console.error("Error creating media URL:", err));

    return () => {
      isMounted = false;
      setUrl(null);
    };
  }, [props.media, endpointUrl, rekuest, profileId]);

  if (!url) {
    return null;
  }

  return props.children(url);
};
