import { IpcTransport } from './IpcTransport';
import { AppModule } from './AppModule';
import { ipcMain } from 'electron';
import fs from 'fs';
import https from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { BigFileUploadGrant } from '../schemas/mikro'; // or whatever the type is, I can use any here

// The AWS SDK talks over Node's TLS stack, which is NOT covered by the app-wide
// `ignore-certificate-errors` switch / `certificate-error` handler in
// src/main/index.ts — those only apply to Chromium's net stack. Datalayer
// deployments routinely use self-signed or expired certs, so without this a
// big-file transfer fails with `certificate has expired` while every other
// request in the app succeeds. keepAlive mirrors the SDK's default agent;
// dropping it would force a fresh TLS handshake per multipart part.
const datalayerHttpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    rejectUnauthorized: false,
});

/**
 * A datalayer behind an organisation mesh is only reachable from main through
 * the mesh sidecar's SOCKS5 port (the renderer gets there via the session's
 * PAC script; Node does not). `socks5h` = the sidecar resolves the name, so
 * MagicDNS works without touching the OS resolver. Same TLS leniency as above.
 */
export const datalayerAgentFor = (
    endpointUrl: string | undefined,
    proxyPortForHost?: (host: string) => number | undefined,
): { httpAgent: SocksProxyAgent | undefined; httpsAgent: SocksProxyAgent | https.Agent } => {
    let host: string | undefined;
    try {
        host = endpointUrl ? new URL(endpointUrl).hostname : undefined;
    } catch {
        host = undefined;
    }
    const port = host ? proxyPortForHost?.(host) : undefined;
    if (!port) return { httpAgent: undefined, httpsAgent: datalayerHttpsAgent };
    const agent = new LenientSocksProxyAgent(`socks5h://127.0.0.1:${port}`, { keepAlive: true, maxSockets: 50 });
    return { httpAgent: agent, httpsAgent: agent };
};

/** The SOCKS agent with the same TLS leniency as `datalayerHttpsAgent`. */
class LenientSocksProxyAgent extends SocksProxyAgent {
    connect(req: Parameters<SocksProxyAgent["connect"]>[0], opts: Parameters<SocksProxyAgent["connect"]>[1]) {
        return super.connect(req, { ...opts, rejectUnauthorized: false } as typeof opts);
    }
}

export class BigFileUploadService implements AppModule {
    private ipcTransport: IpcTransport;
    private activeUploads: Map<string, Upload> = new Map();

    setup() {
        // Required for implementing AppModule
    }

    private readonly proxyPortForHost?: (host: string) => number | undefined;

    constructor(ipcTransport: IpcTransport, proxyPortForHost?: (host: string) => number | undefined) {
        this.ipcTransport = ipcTransport;
        this.proxyPortForHost = proxyPortForHost;

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
            requestHandler: datalayerAgentFor(args.endpointUrl, this.proxyPortForHost),
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
