import { shell } from 'electron';
import { AppModule } from './AppModule';
import { IpcTransport } from './IpcTransport';

export class ShellService implements AppModule {
    private ipcTransport: IpcTransport;

    constructor(ipcTransport: IpcTransport) {
        this.ipcTransport = ipcTransport;

    }

    setup () {

        this.ipcTransport.handleChannel("shell:showItemInFolder", async (_event, args: { path: string }) => {
            shell.showItemInFolder(args.path);
        });

        this.ipcTransport.handleChannel("shell:openPath", async (_event, args: { path: string }) => {
            return await shell.openPath(args.path);
        });
    }
}
