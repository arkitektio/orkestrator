import { useEffect, useState } from "react";

import { aliasToHttpPath } from "@/core/connection/arkitekt/alias/helpers";
import { useArkitektStore } from "@/core/connection/arkitekt/hooks";
import type { Alias } from "@/core/connection/arkitekt/fakts/faktsSchema";

import { schemaHash } from "./serviceSchema";

/**
 * The hash of the schema a connected service serves now (`schemaHash`), read
 * from its `/schema` (the SDL every Arkitekt service publishes there). Null
 * while it is read, when the service is not connected, or when it cannot be
 * read: the caller then has nothing to compare and says nothing.
 *
 * Read once per address and session: a schema changes with a deployment, not
 * while a blok is open.
 */
const hashes = new Map<string, Promise<string | null>>();

const hashAt = (url: string): Promise<string | null> => {
  let pending = hashes.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`${response.status}`))))
      .then(schemaHash)
      .catch((error: unknown) => {
        // A background comparison: worth a line in the console, never a toast.
        console.warn(`Could not read the schema at ${url}`, error);
        return null;
      });
    hashes.set(url, pending);
  }
  return pending;
};

export const useServiceSchemaHash = (serviceKey: string | undefined): string | null => {
  const alias = useArkitektStore((state) =>
    serviceKey ? (state.connection?.serviceMap?.[serviceKey]?.alias as Alias | undefined) : undefined,
  );
  const url = alias ? aliasToHttpPath(alias, "schema") : undefined;
  const [hash, setHash] = useState<{ url: string; hash: string | null } | null>(null);

  useEffect(() => {
    if (!url) return;
    let current = true;
    hashAt(url).then((value) => {
      if (current) setHash({ url, hash: value });
    });
    return () => {
      current = false;
    };
  }, [url]);

  return url && hash?.url === url ? hash.hash : null;
};
