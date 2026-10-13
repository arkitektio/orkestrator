import fs from 'fs/promises';
import path from 'path';
import log from 'electron-log';
import { FaktsConfig } from './FaktsProvider';
import { IpcTransport } from './IpcTransport';
import { AppModule } from './AppModule';
import { dialog, Event } from 'electron';

export class UploadService implements AppModule {
    private isUploading = false;
    private ipcTransport: IpcTransport;
    private currentConfig: FaktsConfig | null = null;

    constructor(ipcTransport: IpcTransport) {
        this.ipcTransport = ipcTransport;
    }

    /**
     * Reconfigures the upload paths when the fakts config updates.
     */
    configure(config: FaktsConfig) {
        // e.g. assign Django S3 API URLs, tokens
        this.currentConfig = config;
        log.info(`UploadService received a configuration update.`);
    }

    onBeforeQuit(event: Event) {
        if (this.isUploading) {
            const choice = dialog.showMessageBoxSync({
                type: 'question',
                buttons: ['Leave and Cancel Upload', 'Wait for Uploads'],
                title: 'Upload in Progress',
                message: 'An upload is still in progress. Quitting now will cancel the process. Do you want to quit?'
            });

            if (choice === 1) { // 1 maps to 'Wait for Uploads'
                event.preventDefault();
            } else {
                this.cancel();
            }
        }
    }

    logToUI(webContents: Electron.WebContents | null, status: string, message: string) {
        if (webContents) {
            this.ipcTransport.sendTo(webContents, 'upload-progress', { status, message });
        }
    }

    cancel() {
        log.warn('UploadService.cancel() triggered.');
        this.isUploading = false;
    }

    async start(folderPath: string, webContents: Electron.WebContents | null) {
        if (!this.currentConfig?.authToken || !this.currentConfig?.s3Endpoint) {
             throw new Error("Upload Service is not configured. Missing Fakts.");
        }

        if (this.isUploading) {
            log.warn('Attempted to start an upload while another is already running.');
            this.logToUI(webContents, 'error', 'An upload is already running.');
            return;
        }

        try {
            this.isUploading = true;
            log.info(`Inspecting target path: ${folderPath}`);
            const stats = await fs.stat(folderPath);
            let allFiles: string[] = [];
            let baseDirectory = '';

            if (stats.isDirectory()) {
                this.logToUI(webContents, 'info', `Scanning directory...`);
                allFiles = await this._getFilesRecursively(folderPath);
                baseDirectory = folderPath;
            } else {
                allFiles = [folderPath];
                baseDirectory = path.dirname(folderPath);
            }

            log.info(`File scan complete. Found ${allFiles.length} files.`);
            this.logToUI(webContents, 'info', `Found ${allFiles.length} files. Starting upload queue...`);

            await this._processQueue(allFiles, 5, async (filePath: string) => {
                if (!this.isUploading) return;

                const relativePath = path.relative(baseDirectory, filePath);
                const s3ObjectKey = relativePath.split(path.sep).join('/');

                try {
                    log.info(`Starting upload lifecycle for: ${s3ObjectKey}`);
                    await this._executeFullS3Lifecycle(filePath, s3ObjectKey, this.currentConfig!.authToken);

                    log.info(`SUCCESS: Finished uploading ${s3ObjectKey}`);
                    this.logToUI(webContents, 'success', `${s3ObjectKey}`);
                } catch (error: any) {
                    log.error(`FAILED: ${s3ObjectKey} - ${error.message}`);
                    this.logToUI(webContents, 'error', `Failed ${s3ObjectKey}: ${error.message}`);
                }
            });

            if (this.isUploading) {
                log.info('All items in the upload queue have been processed.');
                this.logToUI(webContents, 'info', `\n🎉 All backend processes completed!`);
            }
        } catch (error: any) {
            log.error(`Critical system error in UploadService: ${error.stack}`);
            this.logToUI(webContents, 'error', `System error: ${error.message}`);
        } finally {
            this.isUploading = false;
            log.info('UploadService reset to idle state.');
        }
    }

    async _getFilesRecursively(dir: string): Promise<string[]> {
        let results: string[] = [];
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of list) {
            const fullPath = path.resolve(dir, dirent.name);
            if (dirent.isDirectory()) {
                const subFiles = await this._getFilesRecursively(fullPath);
                results = results.concat(subFiles);
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }

    async _processQueue(items: string[], limit: number, asyncCallback: (item: string) => Promise<any>) {
        const results: Promise<any>[] = [];
        const executing: Promise<any>[] = [];
        for (const item of items) {
            const p = Promise.resolve().then(() => asyncCallback(item));
            results.push(p);
            if (limit <= items.length) {
                const e: any = p.then(() => executing.splice(executing.indexOf(e), 1));
                executing.push(e);
                if (executing.length >= limit) await Promise.race(executing);
            }
        }
        return Promise.all(results);
    }

    // A mock method based on your code example
    async _executeFullS3Lifecycle(filePath: string, s3ObjectKey: string, _authToken: string | undefined) {
          // This should use this.currentConfig.s3Endpoint etc.
          // Omitted full logic to focus on refactoring architecture.
          console.log(`Mocking upload for ${filePath} under ${s3ObjectKey}`);
    }
}
