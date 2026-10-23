import { IpcTransport } from './IpcTransport';
import { AppModule } from './AppModule';
import { ipcMain } from 'electron';
import fs from 'fs';
import https from 'https';
import type { ClientRequestArgs } from 'http';
import type { Duplex } from 'stream';
import { TLSSocket } from 'tls';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { BigFileUploadGrant } from '../schemas/mikro'; // or whatever the type is, I can use any here

// The AWS SDK talks over Node's TLS stack, which the session's certificate
// verify proc (src/main/trust) does not cover — that only applies to
// Chromium's net stack. Datalayer deployments routinely use self-signed or
// expired certs, so a datalayer the user's fakts name is let through here too
// (`trust.allows`); a strict hub's datalayer is verified against its pinned
// certificate alone (`trust.pinsFor`); any other host is verified as usual. keepAlive
// mirrors the SDK's default agent; dropping it would force a fresh TLS
// handshake per multipart part.
//
// Lenient still refuses a chain Electron's Node reports as revoked: that is
// how its compiled-in SPKI blocklist (the compromised eMudhra intermediates)
// fails, and `rejectUnauthorized: false` would otherwise swallow it.
const refuseRevoked = <T extends Duplex | null | undefined>(socket: T): T => {
    if (!(socket instanceof TLSSocket)) return socket;
    const check = () => {
        const reason = socket.authorizationError as unknown;
        const code = typeof reason === 'string' ? reason : (reason as { code?: string } | undefined)?.code;
        if (code === 'CERT_REVOKED') socket.destroy(new Error('The server presented a revoked or blocked certificate'));
    };
    if (socket.authorizationError) check();
    else socket.once('secureConnect', check);
    return socket;
};

class LenientHttpsAgent extends https.Agent {
    createConnection(options: ClientRequestArgs, callback?: (err: Error | null, stream: Duplex) => void) {
        return refuseRevoked(super.createConnection(options, callback));
    }
}

const httpsAgents = {
    strict: new https.Agent({ keepAlive: true, maxSockets: 50 }),
    lenient: new LenientHttpsAgent({ keepAlive: true, maxSockets: 50, rejectUnauthorized: false }),
};

/**
 * What the datalayer agents ask of `src/main/trust`: whether a host may present a
 * certificate that fails verification, and which certificates a strict host is
 * pinned to (then those, and only those, are its trust roots).
 */
export type DatalayerTrust = {
    allows: (host: string) => boolean;
    pinsFor: (host: string) => readonly string[] | undefined;
};

const NO_TRUST: DatalayerTrust = { allows: () => false, pinsFor: () => undefined };

/** One pinned agent per set of certificates: keepAlive is only worth anything if it is reused. */
const pinnedAgents = new Map<string, https.Agent>();
const pinnedAgent = (pems: readonly string[]): https.Agent => {
    const key = pems.join("\n");
    let agent = pinnedAgents.get(key);
    if (!agent) {
        // Node verifies the chain and the name against these alone; no public roots.
        agent = new https.Agent({ keepAlive: true, maxSockets: 50, ca: [...pems] });
        pinnedAgents.set(key, agent);
    }
    return agent;
};

/**
 * A datalayer behind an organisation mesh is only reachable from main through
 * the mesh sidecar's SOCKS5 port (the renderer gets there via the session's
 * PAC script; Node does not). `socks5h` = the sidecar resolves the name, so
 * MagicDNS works without touching the OS resolver. Same TLS policy as above.
 */
export const datalayerAgentFor = (
    endpointUrl: string | undefined,
    proxyPortForHost?: (host: string) => number | undefined,
    trust: DatalayerTrust = NO_TRUST,
): { httpAgent: SocksProxyAgent | undefined; httpsAgent: SocksProxyAgent | https.Agent } => {
    let host: string | undefined;
    try {
        host = endpointUrl ? new URL(endpointUrl).hostname : undefined;
    } catch {
        host = undefined;
    }
    const pins = host != null ? trust.pinsFor(host) : undefined;
    const lenient = !pins && host != null && trust.allows(host);
    const port = host ? proxyPortForHost?.(host) : undefined;
    if (!port) {
        return {
            httpAgent: undefined,
            httpsAgent: pins ? pinnedAgent(pins) : lenient ? httpsAgents.lenient : httpsAgents.strict,
        };
    }
    const options = { keepAlive: true, maxSockets: 50 };
    const agent = pins
        ? new PinnedSocksProxyAgent(`socks5h://127.0.0.1:${port}`, options, pins)
        : lenient
          ? new LenientSocksProxyAgent(`socks5h://127.0.0.1:${port}`, options)
          : new SocksProxyAgent(`socks5h://127.0.0.1:${port}`, options);
    return { httpAgent: agent, httpsAgent: agent };
};

/** The SOCKS agent for a strict host: its pinned certificates are the only trust roots. */
class PinnedSocksProxyAgent extends SocksProxyAgent {
    constructor(
        uri: string,
        options: ConstructorParameters<typeof SocksProxyAgent>[1],
        private readonly pins: readonly string[],
    ) {
        super(uri, options);
    }

    connect(req: Parameters<SocksProxyAgent["connect"]>[0], opts: Parameters<SocksProxyAgent["connect"]>[1]) {
        return super.connect(req, { ...opts, ca: [...this.pins], rejectUnauthorized: true } as typeof opts);
    }
}

/** The SOCKS agent for a host whose bad certificate is allowed (revoked still refused). */
class LenientSocksProxyAgent extends SocksProxyAgent {
    async connect(req: Parameters<SocksProxyAgent["connect"]>[0], opts: Parameters<SocksProxyAgent["connect"]>[1]) {
        return refuseRevoked(await super.connect(req, { ...opts, rejectUnauthorized: false } as typeof opts));
    }
}

export class BigFileUploadService implements AppModule {
    private ipcTransport: IpcTransport;
    private activeUploads: Map<string, Upload> = new Map();

    setup() {
        // Required for implementing AppModule
    }

    private readonly proxyPortForHost?: (host: string) => number | undefined;
    private readonly trust?: DatalayerTrust;

    constructor(
        ipcTransport: IpcTransport,
        proxyPortForHost?: (host: string) => number | undefined,
        trust?: DatalayerTrust,
    ) {
        this.ipcTransport = ipcTransport;
        this.proxyPortForHost = proxyPortForHost;
        this.trust = trust;

        ipcMain.handle("upload:bigFile", async (event, args: { uploadId: string, path: string, grant: BigFileUploadGrant, endpointUrl: string }) => {
            return this.handleUpload(event, args);
        });

        ipcMain.handle("upload:cancel", async (_event, args: { uploadId: string }) => {
            const upload = this.activeUploads.get(args.uploadId);
            if (upload) {
                await upload.abort();
                this.activeUploads.delete(args.uploadId);
            }
        });
    }

    async handleUpload(event: Electron.IpcMainInvokeEvent, args: { uploadId: string, path: string, grant: BigFileUploadGrant, endpointUrl: string }) {
        const { uploadId, path, grant } = args;

        const s3Client = new S3Client({
            region: "us-east-1", // MinIO doesn't care but needs an AWS region
            endpoint: args.endpointUrl || undefined, // Endpoint isn't in grant usually, wait it's passed or defined otherwise
            credentials: {
                accessKeyId: grant.accessKey,
                secretAccessKey: grant.secretKey,
                sessionToken: grant.sessionToken,
            },
            forcePathStyle: true,
            requestHandler: datalayerAgentFor(args.endpointUrl, this.proxyPortForHost, this.trust),
        });

        const fileStream = fs.createReadStream(path);
        fileStream.on('error', (err) => {
            console.error("File stream error:", err);
            this.ipcTransport.sendTo(event.sender, `upload-error-${uploadId}`, { error: err.message });
        });

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: grant.bucket,
                Key: grant.key,
                Body: fileStream,
            },
            partSize: 5 * 1024 * 1024,
            leavePartsOnError: false, // delete parts on error
        });

        this.activeUploads.set(uploadId, upload);

        upload.on("httpUploadProgress", (progress) => {
            this.ipcTransport.sendTo(event.sender, `upload-progress-${uploadId}`, {
                loaded: progress.loaded,
                total: progress.total,
            });
        });

        try {
            await upload.done();
            this.activeUploads.delete(uploadId);
            return grant.store;
        } catch (e: any) {
            this.activeUploads.delete(uploadId);
            throw e;
        }
    }
}
