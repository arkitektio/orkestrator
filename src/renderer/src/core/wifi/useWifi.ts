import { useCallback, useEffect, useState } from "react";
import type { EduroamInstitution, WifiProfile, WifiProfileList } from "../../../../main/wifi/protocol";
import { parseEapConfig, type EapConfig } from "./eapConfig";

const wifiApi = () => window.api?.wifi;

/** The saved Wi-Fi profiles (main seals their secrets with the OS keychain). */
export const useWifiProfiles = () => {
  const [list, setList] = useState<WifiProfileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (op: () => Promise<WifiProfileList> | undefined) => {
    try {
      const next = await op();
      if (next) setList(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }, []);

  useEffect(() => {
    if (!wifiApi()) {
      setList({ profiles: [], secretsPersisted: false });
      return;
    }
    void run(() => wifiApi()?.list()).catch(() => undefined);
  }, [run]);

  return {
    profiles: list?.profiles ?? [],
    secretsPersisted: list?.secretsPersisted ?? false,
    loading: list === null,
    error,
    save: (profile: WifiProfile) => run(() => wifiApi()?.save(profile)),
    remove: (id: string) => run(() => wifiApi()?.remove(id)),
  };
};

/** Institutions in the eduroam directory matching `query` (debounced). */
export const useEduroamSearch = (query: string, delayMs = 250) => {
  const [results, setResults] = useState<EduroamInstitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = wifiApi();
    if (!api || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .searchEduroam(query)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setError(null);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => !cancelled && setLoading(false));
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, delayMs]);

  return { results, loading, error };
};

/** Downloads and reads one institution profile's eap-config. */
export const fetchEapConfig = async (eapconfigEndpoint: string): Promise<EapConfig> => {
  const api = wifiApi();
  if (!api) throw new Error("eduroam lookups need the desktop app.");
  return parseEapConfig(await api.eduroamEapConfig(eapconfigEndpoint));
};
