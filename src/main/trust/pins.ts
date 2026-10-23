import { X509Certificate } from "node:crypto";
import { isIP } from "node:net";
import { normalizeHost } from "./policy";

/**
 * Strict hosts: the TLS aliases of a hub that registered its certificate with the
 * coordination server (`instance.tls.certificates` in its fakts). Such a host is
 * trusted with exactly that certificate — byte for byte, for its own name, while
 * it is valid — and with nothing else, a publicly valid certificate included. The
 * lenient rule (`policy.ts`) never applies to it.
 *
 * Main-only (`node:crypto`); `policy.ts` stays importable by the renderer.
 */

/** host → its pinned PEM certificates. */
export type Pins = ReadonlyMap<string, readonly string[]>;

/** A PEM certificate's DER, as whitespace-free base64: what two copies of one certificate share. */
export const certificateKey = (pem: string): string =>
  pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");

/** The pins a renderer sent, cleaned: `{ host: [pem, …] }`, at most `max` hosts. */
export const parsePins = (value: unknown, max: number): Map<string, string[]> => {
  const pins = new Map<string, string[]>();
  if (value == null || typeof value !== "object" || Array.isArray(value)) return pins;
  for (const [rawHost, pems] of Object.entries(value).slice(0, max)) {
    const host = normalizeHost(rawHost);
    if (!host || !Array.isArray(pems)) continue;
    const valid = pems.filter((pem): pem is string => typeof pem === "string" && pem.includes("BEGIN CERTIFICATE")).slice(0, 8);
    if (valid.length) pins.set(host, valid);
  }
  return pins;
};

/**
 * The verdict for a pinned host — 0 accept, -2 refuse — or `undefined` when the
 * host is not pinned (the caller then applies the usual rule).
 */
export const pinnedVerdict = (
  request: { hostname: string; certificate?: { data?: string } },
  pins: Pins,
  now: number = Date.now(),
): 0 | -2 | undefined => {
  const host = normalizeHost(request.hostname);
  const pinned = host ? pins.get(host) : undefined;
  if (!host || !pinned) return undefined;
  const pem = request.certificate?.data;
  if (!pem || !pinned.some((candidate) => certificateKey(candidate) === certificateKey(pem))) return -2;
  try {
    const certificate = new X509Certificate(pem);
    if (now < Date.parse(certificate.validFrom) || now > Date.parse(certificate.validTo)) return -2;
    const named = isIP(host) ? certificate.checkIP(host) : certificate.checkHost(host);
    return named ? 0 : -2;
  } catch {
    return -2;
  }
};
