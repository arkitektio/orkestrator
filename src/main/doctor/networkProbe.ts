import { lookup as dnsLookup, resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import { connect as netConnect } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { checkServerIdentity, connect as tlsConnect } from "node:tls";
import type { TLSSocket } from "node:tls";
import { SocksClient } from "socks";
import { SocksProxyAgent } from "socks-proxy-agent";
import type {
  DnsStage,
  HttpStage,
  NetworkProbeResult,
  ProbeTarget,
  TcpStage,
  TlsStage,
} from "./protocol";
import {
  DOCTOR_TIMEOUT_CODE,
  describeCertificate,
  errorCode,
  errorMessage,
  looksLikeNotTls,
} from "./networkErrors";

/**
 * The one impure file in the doctor: it opens real sockets.
 *
 * It is deliberately decision-free — it records what each stage did and hands
 * that to `networkErrors.ts` (pure, tested) and ultimately to the renderer's
 * `diagnose()` (pure, tested). Nothing here decides what a failure *means*,
 * which is why it needs no unit test of its own.
 *
 * It uses Node's stack, NOT `electron.net`, on purpose: main sets
 * `ignore-certificate-errors` and a blanket `certificate-error → allow`
 * (src/main/index.ts), which neuters Chromium's verification. Node's TLS is
 * untouched, so this is the only way left to give an honest answer about a
 * certificate.
 */

const portOf = (target: ProbeTarget): number =>
  target.port ?? (target.ssl ? 443 : 80);

export const probeUrl = (target: ProbeTarget): string => {
  const scheme = target.ssl ? "https" : "http";
  const host = isIP(target.host) === 6 ? `[${target.host}]` : target.host;
  const port = target.port ? `:${target.port}` : "";
  const path = target.path ? `/${target.path}` : "";
  const probePath = target.probePath ? `/${target.probePath}` : "";
  return `${scheme}://${host}${port}${path}${probePath}`;
};

/* ────────────────────────────────── DNS ───────────────────────────────── */

/**
 * Resolved twice on purpose — see `DnsStage` in the protocol. `lookup` is the
 * OS resolver (MagicDNS-aware); `resolve4/6` talks to the nameservers directly.
 * Their disagreement is the cheapest signal in the whole feature.
 */
const probeDns = async (host: string): Promise<DnsStage> => {
  if (isIP(host) !== 0) {
    return { ok: true, skipped: true, lookupAddresses: [host], resolveAddresses: [host] };
  }

  const [lookupResult, resolveResult] = await Promise.allSettled([
    dnsLookup(host, { all: true }),
    Promise.any([resolve4(host), resolve6(host)]),
  ]);

  const lookupAddresses =
    lookupResult.status === "fulfilled"
      ? lookupResult.value.map((entry) => entry.address)
      : [];
  const resolveAddresses =
    resolveResult.status === "fulfilled" ? resolveResult.value : [];

  const lookupError =
    lookupResult.status === "rejected"
      ? errorCode(lookupResult.reason) ?? errorMessage(lookupResult.reason)
      : undefined;
  // `Promise.any` rejects with an AggregateError; the individual errno is more
  // useful than "all promises were rejected".
  const resolveError =
    resolveResult.status === "rejected"
      ? errorCode((resolveResult.reason as AggregateError)?.errors?.[0]) ??
        errorCode(resolveResult.reason) ??
        errorMessage(resolveResult.reason)
      : undefined;

  return {
    ok: lookupAddresses.length > 0,
    lookupAddresses,
    resolveAddresses,
    lookupError,
    resolveError,
    code: lookupError,
  };
};

/* ────────────────────────────────── TCP ───────────────────────────────── */

const probeTcp = (host: string, port: number, timeoutMs: number): Promise<TcpStage> =>
  new Promise((resolve) => {
    const started = Date.now();
    let settled = false;

    const finish = (stage: Omit<TcpStage, "attempted" | "ms">) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ attempted: true, ms: Date.now() - started, ...stage });
    };

    const socket = netConnect({ host, port });
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ ok: true }));
    socket.once("timeout", () =>
      finish({ ok: false, code: DOCTOR_TIMEOUT_CODE, message: `no answer after ${timeoutMs}ms` }),
    );
    socket.once("error", (error) =>
      finish({ ok: false, code: errorCode(error), message: errorMessage(error) }),
    );
  });

/* ────────────────────────────────── TLS ───────────────────────────────── */

/**
 * Connect WITHOUT rejecting, then verify by hand. Refusing at the socket would
 * give us one opaque error; this way we can say which of "self-signed",
 * "expired", "wrong name" or "not TLS at all" it is.
 */
const probeTls = (host: string, port: number, timeoutMs: number): Promise<TlsStage> =>
  new Promise((resolve) => {
    let settled = false;

    const finish = (stage: TlsStage) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(stage);
    };

    const socket: TLSSocket = tlsConnect({
      host,
      port,
      servername: isIP(host) === 0 ? host : undefined,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });

    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const hostnameError =
        isIP(host) === 0 && certificate
          ? checkServerIdentity(host, certificate)?.message
          : undefined;

      finish(
        describeCertificate({
          authorized: socket.authorized,
          authorizationError: socket.authorizationError
            ? String((socket.authorizationError as Error & { code?: string }).code ??
                socket.authorizationError.message ??
                socket.authorizationError)
            : undefined,
          peerCertificate: certificate as never,
          hostnameError,
        }),
      );
    });

    socket.once("timeout", () =>
      finish({ attempted: true, ok: false, message: `handshake timed out after ${timeoutMs}ms` }),
    );

    socket.once("error", (error) =>
      finish({
        attempted: true,
        ok: false,
        notTls: looksLikeNotTls(error) || undefined,
        message: errorMessage(error),
      }),
    );
  });

/* ────────────────────────────────── HTTP ──────────────────────────────── */

const probeHttp = (
  target: ProbeTarget,
  url: string,
  timeoutMs: number,
  agent?: SocksProxyAgent,
): Promise<HttpStage> =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (stage: HttpStage) => {
      if (settled) return;
      settled = true;
      resolve(stage);
    };

    const request = (target.ssl ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        timeout: timeoutMs,
        agent,
        // The cert story is already known from the TLS stage; failing here
        // again would just hide the status code we came for.
        ...(target.ssl ? { rejectUnauthorized: false } : {}),
      },
      (response) => {
        const chunks: Buffer[] = [];
        let length = 0;
        response.on("data", (chunk: Buffer) => {
          if (length >= 200) return;
          chunks.push(chunk);
          length += chunk.length;
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          finish({
            attempted: true,
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage,
            server: Array.isArray(response.headers.server)
              ? response.headers.server[0]
              : response.headers.server,
            bodySnippet: Buffer.concat(chunks).toString("utf8").slice(0, 200),
          });
        });
        response.on("error", (error) =>
          finish({ attempted: true, ok: false, message: errorMessage(error) }),
        );
      },
    );

    request.once("timeout", () => {
      request.destroy();
      finish({
        attempted: true,
        ok: false,
        code: DOCTOR_TIMEOUT_CODE,
        message: `no response after ${timeoutMs}ms`,
      });
    });
    request.once("error", (error) =>
      finish({ attempted: true, ok: false, code: errorCode(error), message: errorMessage(error) }),
    );
    request.end();
  });

/* ───────────────────────── through the mesh proxy ─────────────────────── */

/**
 * The same walk, but for a host the built-in mesh routes: dial through the
 * mesh's SOCKS5 proxy (which resolves the name — MagicDNS never touches the
 * OS), so the answer is about the peer and the service on it, not about this
 * computer's DNS. `socks5h`-style: the hostname goes to the proxy.
 */
const probeTcpViaSocks = (host: string, port: number, proxyPort: number, timeoutMs: number): Promise<TcpStage> =>
  new Promise((resolve) => {
    const started = Date.now();
    SocksClient.createConnection({
      proxy: { host: "127.0.0.1", port: proxyPort, type: 5 },
      command: "connect",
      destination: { host, port },
      timeout: timeoutMs,
    })
      .then(({ socket }) => {
        socket.destroy();
        resolve({ attempted: true, ok: true, ms: Date.now() - started });
      })
      .catch((error: unknown) => {
        const message = errorMessage(error);
        resolve({
          attempted: true,
          ok: false,
          ms: Date.now() - started,
          code: /timed? ?out/i.test(message) ? DOCTOR_TIMEOUT_CODE : "MESH_DIAL_FAILED",
          message,
        });
      });
  });

const probeHttpViaSocks = (
  target: ProbeTarget,
  url: string,
  proxyPort: number,
  timeoutMs: number,
): Promise<HttpStage> => {
  const agent = new SocksProxyAgent(`socks5h://127.0.0.1:${proxyPort}`, { timeout: timeoutMs });
  return probeHttp(target, url, timeoutMs, agent);
};

/* ─────────────────────────────── the walk ─────────────────────────────── */

const SKIPPED_TCP: TcpStage = { attempted: false, ok: false, ms: 0 };
const SKIPPED_TLS: TlsStage = { attempted: false, ok: false };
const SKIPPED_HTTP: HttpStage = { attempted: false, ok: false };

/**
 * Walk the four stages, stopping at the first one that fails: there is nothing
 * to learn from a TLS handshake against a port that refused the connection,
 * and the report reads better without the noise.
 */
export const probeTarget = async (
  target: ProbeTarget,
  timeoutMs: number,
  /** The built-in mesh proxy this host is routed through, if any. */
  viaMeshProxy?: number,
): Promise<NetworkProbeResult> => {
  const started = Date.now();
  const url = probeUrl(target);
  const port = portOf(target);
  const done = (dns: DnsStage, tcp: TcpStage, tls: TlsStage, http: HttpStage): NetworkProbeResult => ({
    target,
    url,
    dns,
    tcp,
    tls,
    http,
    totalMs: Date.now() - started,
    ...(viaMeshProxy ? { viaMeshProxy } : {}),
  });

  if (viaMeshProxy) {
    const dns: DnsStage = { ok: true, skipped: true, lookupAddresses: [], resolveAddresses: [] };
    const tcp = await probeTcpViaSocks(target.host, port, viaMeshProxy, timeoutMs);
    if (!tcp.ok) return done(dns, tcp, SKIPPED_TLS, SKIPPED_HTTP);
    const http = await probeHttpViaSocks(target, url, viaMeshProxy, timeoutMs);
    return done(dns, tcp, SKIPPED_TLS, http);
  }

  const dns = await probeDns(target.host);
  // No address at all from either resolver: nothing to connect to.
  if (!dns.ok && dns.resolveAddresses.length === 0) {
    return done(dns, SKIPPED_TCP, SKIPPED_TLS, SKIPPED_HTTP);
  }

  const tcp = await probeTcp(target.host, port, timeoutMs);
  if (!tcp.ok) return done(dns, tcp, SKIPPED_TLS, SKIPPED_HTTP);

  const tls = target.ssl ? await probeTls(target.host, port, timeoutMs) : SKIPPED_TLS;
  // A port that is not TLS at all will not answer an HTTPS request either.
  if (target.ssl && tls.notTls) return done(dns, tcp, tls, SKIPPED_HTTP);

  const http = await probeHttp(target, url, timeoutMs);
  return done(dns, tcp, tls, http);
};
