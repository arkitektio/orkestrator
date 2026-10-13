import { BrowserWindow } from 'electron';
import { download } from 'electron-dl';
import { IpcTransport } from './IpcTransport';
import { AppModule } from './AppModule';

export class DownloadManager implements AppModule {
    constructor(private ipcTransport: IpcTransport) {}

    setup() {
        this.ipcTransport.handleChannel("download-from-url", async (_event, { url }: { url: string }) => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win) return { success: false, error: "No active window" };

            try {
                const dl = await download(win, url);
                return { success: true, path: dl.getSavePath() };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        });
    }
}
