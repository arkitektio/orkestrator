import { IpcTransport } from './IpcTransport';
import { AppModule } from './AppModule';
import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'stream/promises';
import { Readable, Transform } from 'stream';
import { BigFileAccessGrant } from '../schemas/mikro';
import { datalayerAgentFor } from './BigFileUploadService';

type DownloadArgs = {
    downloadId: string;
    grant: BigFileAccessGrant;
    endpointUrl: string;
    fileName: string;
    savePath?: string;
};

export class BigFileDownloadService implements AppModule {
    private ipcTransport: IpcTransport;
    private activeDownloads: Map<string, any> = new Map(); // AbortController for downloads

    setup() {
        // Required for implementing AppModule
    }

    private readonly proxyPortForHost?: (host: string) => number | undefined;

    constructor(ipcTransport: IpcTransport, proxyPortForHost?: (host: string) => number | undefined) {
        this.ipcTransport = ipcTransport;
        this.proxyPortForHost = proxyPortForHost;

        ipcMain.handle("download:bigFile", async (event, args: DownloadArgs) => {
            return this.handleDownload(event, args);
        });

        ipcMain.handle("download:cancel", async (_event, args: { downloadId: string }) => {
            const controller = this.activeDownloads.get(args.downloadId);
            if (controller) {
                controller.abort();
                this.activeDownloads.delete(args.downloadId);
            }
        });
    }

    private toNodeReadable(body: unknown): Readable {
        if (!body) {
            throw new Error('No body stream in response');
        }

        if (body instanceof Readable) {
            return body;
        }

        if (typeof (body as { transformToWebStream?: () => unknown }).transformToWebStream === 'function') {
            return Readable.fromWeb((body as { transformToWebStream: () => unknown }).transformToWebStream() as any);
        }

        if (typeof Readable.fromWeb === 'function' && body instanceof ReadableStream) {
            return Readable.fromWeb(body as any);
        }

        if (Buffer.isBuffer(body) || body instanceof Uint8Array || typeof body === 'string') {
            return Readable.from([body]);
        }

        throw new Error('Unsupported download body type');
    }

    async handleDownload(event: Electron.IpcMainInvokeEvent, args: DownloadArgs) {
        const { downloadId, grant, fileName } = args;
        const endpoint = grant.datalayer || args.endpointUrl || undefined;
        const savePath = args.savePath || path.join(app.getPath('downloads'), fileName || 'download');
        const partialPath = `${savePath}.part`;

        const s3Client = new S3Client({
            region: "us-east-1",
            endpoint,
            credentials: {
                accessKeyId: grant.accessKey,
                secretAccessKey: grant.secretKey,
                sessionToken: grant.sessionToken,
            },
            forcePathStyle: true,
            requestHandler: datalayerAgentFor(endpoint, this.proxyPortForHost),
        });

        const abortController = new AbortController();
        this.activeDownloads.set(downloadId, abortController);

        try {
            const response = await s3Client.send(new GetObjectCommand({
                Bucket: grant.bucket,
                Key: grant.key,
            }), { abortSignal: abortController.signal });

            const bodyStream = this.toNodeReadable(response.Body);

            const total = response.ContentLength || 0;
            let loaded = 0;

            let lastUpdate = 0;
            const progressStream = new Transform({
                transform: (chunk, _encoding, callback) => {
                    loaded += chunk.length;
                    const now = Date.now();
                    if (now - lastUpdate > 250 || loaded === total) {
                        try {
                            this.ipcTransport.sendTo(event.sender, `download-progress-${downloadId}`, {
                                loaded,
                                total,
                            });
                        } catch(e) {}
                        lastUpdate = now;
                    }
                    callback(null, chunk);
                }
            });

            await fs.promises.mkdir(path.dirname(savePath), { recursive: true });

            const fileStream = fs.createWriteStream(partialPath, { flags: 'w' });
            await pipeline(bodyStream, progressStream, fileStream, { signal: abortController.signal });

            const stats = await fs.promises.stat(partialPath);
            if (total > 0 && stats.size === 0) {
                throw new Error('Download completed with zero bytes written');
            }

            await fs.promises.rename(partialPath, savePath);
            this.ipcTransport.sendTo(event.sender, `download-progress-${downloadId}`, {
                loaded: total || stats.size,
                total: total || stats.size,
            });

            this.activeDownloads.delete(downloadId);
            return savePath;
        } catch (e: any) {
            this.activeDownloads.delete(downloadId);
            if (e.name === 'AbortError') {
                fs.unlink(partialPath, () => {});
            } else {
                fs.unlink(partialPath, () => {});
                this.ipcTransport.sendTo(event.sender, `download-error-${downloadId}`, { error: e.message });
            }
            throw e;
        }
    }
}
