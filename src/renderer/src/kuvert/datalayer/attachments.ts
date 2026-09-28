import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { grantExpiresAt, presignS3Url } from "@/core/data/s3/s3request";
import { useDownload } from "@/core/modules/download/DownloadProvider";
import { useCallback, useEffect, useState } from "react";
import { useKuvert } from "../api/funcs";
import {
  BigFileAccessGrantFragment,
  MessageAttachmentAccessDocument,
  MessageAttachmentAccessQuery,
  MessageAttachmentAccessQueryVariables,
  useMessageAttachmentAccessQuery,
} from "../api/graphql";

export type AttachmentUrls = {
  /** Presigned URL per attachment id. */
  byId: ReadonlyMap<string, string>;
  /** Presigned URL per Content-ID, for `cid:` images. */
  byCid: ReadonlyMap<string, string>;
};

const EMPTY: AttachmentUrls = { byId: new Map(), byCid: new Map() };

const objectUrl = (datalayer: string, grant: BigFileAccessGrantFragment) =>
  datalayer + "/" + grant.bucket + "/" + grant.key;

/**
 * Presigned URLs for a message's attachments, signed client-side from each
 * store's access grant (never a server-presigned field). Asked for only when
 * `enabled`, i.e. when the message shows inline images or its attachments.
 * An attachment without a store (no datalayer) gets no URL.
 */
export const useAttachmentUrls = (message: string, enabled: boolean): AttachmentUrls => {
  const datalayer = useDatalayerEndpoint();
  const { data } = useMessageAttachmentAccessQuery({
    variables: { message },
    skip: !enabled || !datalayer,
    fetchPolicy: "network-only",
  });
  const [urls, setUrls] = useState<AttachmentUrls>(EMPTY);

  useEffect(() => {
    const attachments = data?.message.attachments;
    if (!attachments || !datalayer) return;
    let cancelled = false;
    const issuedAt = Date.now();
    Promise.all(
      attachments.map(async (a) => {
        const grant = a.store?.accessGrant;
        if (!grant) return null;
        const url = await presignS3Url(objectUrl(datalayer, grant), {
          ...grant,
          expiresAt: grantExpiresAt(grant, issuedAt),
        });
        return { id: a.id, cid: a.contentId, url };
      }),
    ).then((signed) => {
      if (cancelled) return;
      const byId = new Map<string, string>();
      const byCid = new Map<string, string>();
      for (const s of signed) {
        if (!s) continue;
        byId.set(s.id, s.url);
        if (s.cid) byCid.set(s.cid, s.url);
      }
      setUrls({ byId, byCid });
    });
    return () => {
      cancelled = true;
    };
  }, [data, datalayer]);

  return urls;
};

/** The datalayer origin, for the mail body's image CSP. */
export const useDatalayerOrigin = () => {
  const datalayer = useDatalayerEndpoint();
  try {
    return datalayer ? new URL(datalayer).origin : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Save an attachment to disk through the Electron big-file path, with its
 * progress on the rail. A fresh grant per save, so an old tab never hands
 * over expired credentials.
 */
export const useSaveAttachment = () => {
  const client = useKuvert();
  const datalayer = useDatalayerEndpoint();
  const { startDownload } = useDownload();

  return useCallback(
    async (message: string, attachment: { id: string; filename: string }) => {
      if (!datalayer) throw new Error("No datalayer configured: attachments cannot be read");
      if (!window.api?.downloadBigFile) throw new Error("Saving attachments needs the desktop app");
      const { data } = await client.query<MessageAttachmentAccessQuery, MessageAttachmentAccessQueryVariables>({
        query: MessageAttachmentAccessDocument,
        variables: { message },
        fetchPolicy: "network-only",
      });
      const grant = data.message.attachments.find((a) => a.id === attachment.id)?.store?.accessGrant;
      if (!grant) throw new Error("This attachment is not stored in the datalayer");
      return startDownload(attachment.filename, ({ id, signal }) => {
        signal.addEventListener("abort", () => void window.api.cancelBigFileDownload({ downloadId: id }));
        return window.api.downloadBigFile({
          downloadId: id,
          grant,
          endpointUrl: datalayer,
          fileName: attachment.filename,
        });
      });
    },
    [client, datalayer, startDownload],
  );
};
