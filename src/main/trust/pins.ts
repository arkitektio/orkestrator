import { X509Certificate } from "node:crypto";
import { isIP } from "node:net";
import { normalizeHost } from "./policy";

/**
 * Strict hosts: the TLS aliases of a hub that registered its certificates with the
 * coordination server (`instance.tls.certificates` in its fakts). Such a host is
 * trusted only through them, a publicly valid certificate included: the
 * certificate it presents must be one of them byte for byte, or chain to one of
 * them that is a CA (through the intermediates the server sends). Either way it
 * must be for the host's own name and valid now. The lenient rule (`policy.ts`)
 * never applies to it.
 *
 * This is the same rule Node applies when the registered certificates are its
 * only trust roots (`nodeFetch.ts`, the datalayer agents).
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

/** What Electron's verify proc hands over: the leaf, and above it the chain the server sent. */
type Presented = { data?: string; issuerCert?: Presented };

/** No private deployment is deeper than this; it also bounds a malformed, looping chain. */
const MAX_CHAIN = 8;

const PEM_BLOCK = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;

/** Every certificate in the PEMs (an entry may be a bundle); one that does not parse is skipped. */
const parsed = (pems: readonly (string | undefined)[]): X509Certificate[] => {
  const certificates: X509Certificate[] = [];
  for (const pem of pems) {
    for (const block of pem?.match(PEM_BLOCK) ?? []) {
      try {
        certificates.push(new X509Certificate(block));
      } catch {
        // not a certificate
      }
    }
  }
  return certificates;
};

const validAt = (certificate: X509Certificate, now: number): boolean =>
  now >= Date.parse(certificate.validFrom) && now <= Date.parse(certificate.validTo);

/** Whether `issuer` is a CA, valid now, that signed `subject`. */
const issued = (issuer: X509Certificate, subject: X509Certificate, now: number): boolean => {
  try {
    return issuer.ca && validAt(issuer, now) && subject.checkIssued(issuer) && subject.verify(issuer.publicKey);
  } catch {
    return false;
  }
};

/** Whether `leaf` is a pinned certificate, or chains to one through `intermediates`. */
const reachesPin = (
  leaf: X509Certificate,
  intermediates: readonly X509Certificate[],
  pinned: readonly X509Certificate[],
  now: number,
): boolean => {
  let current = leaf;
  for (let depth = 0; depth < MAX_CHAIN; depth += 1) {
    if (pinned.some((pin) => pin.raw.equals(current.raw))) return true;
    if (pinned.some((pin) => issued(pin, current, now))) return true;
    const above = intermediates.find((candidate) => issued(candidate, current, now));
    if (!above) return false;
    current = above;
  }
  return false;
};

/**
 * The verdict for a pinned host — 0 accept, -2 refuse — or `undefined` when the
 * host is not pinned (the caller then applies the usual rule).
 */
export const pinnedVerdict = (
  request: { hostname: string; certificate?: Presented },
  pins: Pins,
  now: number = Date.now(),
): 0 | -2 | undefined => {
  const host = normalizeHost(request.hostname);
  const pinned = host ? pins.get(host) : undefined;
  if (!host || !pinned) return undefined;
  const [leaf] = parsed([request.certificate?.data]);
  if (!leaf || !validAt(leaf, now)) return -2;
  const named = isIP(host) ? leaf.checkIP(host) : leaf.checkHost(host);
  if (!named) return -2;
  const sent: (string | undefined)[] = [];
  for (let above = request.certificate?.issuerCert; above && sent.length < MAX_CHAIN; above = above.issuerCert) {
    sent.push(above.data);
  }
  return reachesPin(leaf, parsed(sent), parsed(pinned), now) ? 0 : -2;
};
