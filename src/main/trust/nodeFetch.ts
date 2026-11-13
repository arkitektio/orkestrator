import { TLSSocket } from "node:tls";
import { Agent, ProxyAgent, buildConnector, fetch as undiciFetch, type Dispatcher } from "undici";

/**
 * `fetch` for main's own requests (the Electron agent's GraphQL clients, the
 * asset fetch). They run on Node's TLS stack, which the session's certificate
 * verify proc (`CertificateTrust`) does not cover, so a hub with a self-signed
 * certificate or its own CA was refused here while the renderer reached it.
 *
 * Same policy as the datalayer agents (`BigFileUploadService`):
 *  - a pinned host is verified against the certificates its hub registered,
 *    and nothing else (they are its only trust roots, so a CA certificate and a
 *    self-signed leaf both work);
 *  - any other host the user's fakts name may present a certificate that fails
 *    verification;
 *  - every other host is verified as usual, by Node's built-in `fetch`.
 */

/** What Node's callers ask of `CertificateTrust`. */
export type NodeTrust = {
  /** Whether the host may present a certificate that fails verification. */
  allows: (host: string) => boolean;
  /** The certificates a strict host is pinned to: then those alone are its trust roots. */
  pinsFor: (host: string) => readonly string[] | undefined;
};

export const NO_TRUST: NodeTrust = { allows: () => false, pinsFor: () => undefined };

export type TlsMode =
  | { kind: "pinned"; pins: readonly string[] }
  | { kind: "lenient" }
  | { kind: "strict" };

/** How a connection to `host` is verified. A pinned host is never lenient. */
export const tlsModeFor = (host: string, trust: NodeTrust): TlsMode => {
  const pins = trust.pinsFor(host);
  if (pins?.length) return { kind: "pinned", pins };
  return trust.allows(host) ? { kind: "lenient" } : { kind: "strict" };
};

/**
 * The TLS options for a pinned host: its certificates are the only trust roots,
 * and any one of them anchors the chain, CA or not.
 *
 * `allowPartialTrustChain` is what makes a self-signed NON-CA leaf work: a hub
 * registers exactly that (no basicConstraints, keyUsage digitalSignature), and
 * Electron's Node (BoringSSL) does not treat a certificate without keyCertSign
 * as self-signed, so with `ca` alone it looks for an issuer, finds none and
 * fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. Plain Node (OpenSSL 3) accepts it
 * either way, so a test under vitest cannot tell the difference.
 */
export const pinnedTls = (pins: readonly string[]): { ca: string[]; allowPartialTrustChain: true; rejectUnauthorized: true } => ({
  ca: [...pins],
  allowPartialTrustChain: true,
  rejectUnauthorized: true,
});

const isRevoked = (socket: TLSSocket): boolean => {
  const reason = socket.authorizationError as unknown;
  const code = typeof reason === "string" ? reason : (reason as { code?: string } | undefined)?.code;
  return code === "CERT_REVOKED";
};

/**
 * Accepts a certificate that fails verification, except a chain Electron's Node
 * reports as revoked (its compiled-in SPKI blocklist), which
 * `rejectUnauthorized: false` would otherwise swallow.
 */
const lenientConnector = (): buildConnector.connector => {
  const connect = buildConnector({ rejectUnauthorized: false });
  return (options, callback) =>
    connect(options, (error, socket) => {
      if (error || !socket) return callback(error ?? new Error("The connection failed"), null);
      if (socket instanceof TLSSocket && isRevoked(socket)) {
        socket.destroy();
        return callback(new Error("The server presented a revoked or blocked certificate"), null);
      }
      callback(null, socket);
    });
};

const build = (mode: TlsMode, port: number | undefined): Dispatcher => {
  if (port) {
    const uri = `http://127.0.0.1:${port}`;
    if (mode.kind === "pinned") return new ProxyAgent({ uri, requestTls: pinnedTls(mode.pins) });
    // ProxyAgent has no hook on the tunnelled socket, so a revoked chain is not
    // refused on this path the way `lenientConnector` refuses it.
    if (mode.kind === "lenient") return new ProxyAgent({ uri, requestTls: { rejectUnauthorized: false } });
    return new ProxyAgent(uri);
  }
  if (mode.kind === "pinned") return new Agent({ connect: pinnedTls(mode.pins) });
  if (mode.kind === "lenient") return new Agent({ connect: lenientConnector() });
  return new Agent();
};

const keyOf = (mode: TlsMode, port: number | undefined): string =>
  `${port ?? "direct"}|${mode.kind}|${mode.kind === "pinned" ? mode.pins.join("\n") : ""}`;

/**
 * One dispatcher per proxy port, mode and pin set: keep-alive is only worth
 * anything if it is reused, and a changed pin set must not reuse a connection
 * the old one accepted.
 */
export const createDispatchers = (make: typeof build = build) => {
  const cache = new Map<string, Dispatcher>();
  return (mode: TlsMode, port?: number): Dispatcher => {
    const key = keyOf(mode, port);
    let dispatcher = cache.get(key);
    if (!dispatcher) {
      dispatcher = make(mode, port);
      cache.set(key, dispatcher);
    }
    return dispatcher;
  };
};

export type NodeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * `proxyPortForHost` is the MeshService's routing table: main's requests do not
 * go through the renderer session's proxy, so a service behind an organisation
 * mesh is only reachable through the sidecar's HTTP CONNECT port. `undefined`
 * means a direct connection.
 */
export const trustedFetch = (
  trust: NodeTrust = NO_TRUST,
  proxyPortForHost?: (host: string) => number | undefined,
): NodeFetch => {
  const dispatcherFor = createDispatchers();
  return (input, init) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href);
    const port = proxyPortForHost?.(url.hostname);
    const mode: TlsMode = url.protocol === "https:" ? tlsModeFor(url.hostname, trust) : { kind: "strict" };
    if (!port && mode.kind === "strict") return fetch(input, init);
    // The package's dispatchers go with the package's fetch, never Node's built-in one.
    return undiciFetch(href, {
      ...(init as Record<string, unknown>),
      dispatcher: dispatcherFor(mode, port),
    }) as unknown as Promise<Response>;
  };
};
