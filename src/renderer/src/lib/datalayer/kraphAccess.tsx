import { ApolloClient, gql } from "@apollo/client";
import { useDatalayerEndpoint, useKraph } from "@/app/Arkitekt";
import { MediaStoreFragment } from "@/kraph/api/graphql";
import React from "react";
import { grantExpiresAt, presignS3Url, S3SigningCredentials } from "./s3request";
import { useNearViewport } from "./useNearViewport";

/**
 * Kraph media (category and term images) through an access grant, mirroring
 * `mikroAccess.tsx`. The server-side `MediaStore.presignedUrl` is a
 * compatibility field that only returns the object path now, so nothing
 * here reads it: the client asks for one general grant per session and
 * signs each object URL itself.
 *
 * The `requestGeneralMediaAccess` mutation is not in the kraph schema yet —
 * it is being added server-side to mirror mikro's. Until it lands this
 * document is hand-written (the generated api must not be edited); once
 * `graphql/schemas/kraph.graphql` carries it, move the mutation into
 * `graphql/kraph/mutations/` and swap this for the generated document.
 */
const REQUEST_GENERAL_MEDIA_ACCESS = gql`
  mutation RequestGeneralMediaAccess($input: RequestGeneralMediaAccessInput!) {
    requestGeneralMediaAccess(input: $input) {
      accessKey
      secretKey
      sessionToken
      expiresIn
      region
      bucket
    }
  }
`;

type GeneralMediaAccessGrant = {
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  expiresIn: number;
  region: string;
  bucket: string;
};

export type KraphMediaCredentials = GeneralMediaAccessGrant & { expiresAt: number };

const CREDENTIAL_REFRESH_SKEW_MS = 60_000;

let cachedCredentialsPromise: Promise<KraphMediaCredentials> | null = null;
let cachedCredentials: KraphMediaCredentials | null = null;

const getCredentials = async (client: ApolloClient<any>): Promise<KraphMediaCredentials> => {
  const now = Date.now();
  if (cachedCredentials && now < cachedCredentials.expiresAt - CREDENTIAL_REFRESH_SKEW_MS) {
    return cachedCredentials;
  }
  if (cachedCredentialsPromise) {
    return cachedCredentialsPromise;
  }

  cachedCredentialsPromise = client
    .mutate<{ requestGeneralMediaAccess: GeneralMediaAccessGrant }, { input: Record<string, never> }>({
      mutation: REQUEST_GENERAL_MEDIA_ACCESS,
      variables: { input: {} },
    })
    .then(({ data }) => {
      const grant = data?.requestGeneralMediaAccess;
      if (!grant) {
        throw new Error("Failed to get kraph media access credentials");
      }
      const credentials: KraphMediaCredentials = { ...grant, expiresAt: grantExpiresAt(grant) };
      cachedCredentials = credentials;
      return credentials;
    })
    .catch((err) => {
      cachedCredentials = null;
      throw err;
    })
    .finally(() => {
      cachedCredentialsPromise = null;
    });

  return cachedCredentialsPromise;
};

const signingCredentials = (credentials: KraphMediaCredentials): S3SigningCredentials => ({
  accessKey: credentials.accessKey,
  secretKey: credentials.secretKey,
  sessionToken: credentials.sessionToken,
  region: credentials.region,
  expiresAt: credentials.expiresAt,
});

/** The object URL on the datalayer, signed with the session's grant. */
export const getKraphMediaUrl = async (
  media: MediaStoreFragment,
  client: ApolloClient<any>,
  datalayer: string,
): Promise<string> => {
  const credentials = await getCredentials(client);
  return presignS3Url(`${datalayer}/${media.bucket}/${media.key}`, signingCredentials(credentials));
};

// The grant mutation is missing on servers that predate it; say so once
// instead of once per image.
let warnedMissingGrant = false;

/**
 * Renders `children(url)` with a client-signed URL for `media` once the
 * element is near the viewport. Renders nothing while the URL is pending or
 * when the grant cannot be obtained.
 */
export const WithKraphMediaUrl = (props: {
  children: (url: string) => React.ReactNode;
  media?: MediaStoreFragment | undefined | null;
}) => {
  const endpointUrl = useDatalayerEndpoint();
  const kraph = useKraph();

  const sentinelRef = React.useRef<HTMLSpanElement | null>(null);
  const near = useNearViewport(sentinelRef);
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!endpointUrl || !props.media || !near) return;

    let isMounted = true;
    getKraphMediaUrl(props.media, kraph, endpointUrl)
      .then((mediaUrl) => {
        if (isMounted) setUrl(mediaUrl);
      })
      .catch((err) => {
        if (!warnedMissingGrant) {
          warnedMissingGrant = true;
          console.warn("[kraph media] no access grant, images stay hidden:", err);
        }
      });

    return () => {
      isMounted = false;
      setUrl(null);
    };
  }, [props.media, endpointUrl, kraph, near]);

  if (!url) {
    return <span ref={sentinelRef} aria-hidden className="absolute inset-0 pointer-events-none" />;
  }

  return props.children(url);
};
