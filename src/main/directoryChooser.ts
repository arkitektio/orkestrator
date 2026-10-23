import { BrowserWindow, dialog } from "electron";
import { electronRegistry } from "./agent-registry";
import { ActionKind, PortKind } from "./schemas/rekuest";

/**
 * `choose_directory`: the person picks a folder in the OS dialog and its path
 * goes back to the app that asked. What `watch_directory` watches, say.
 */
export const registerDirectoryChooser = () => {
    electronRegistry.register(
        "choose_directory",
        async (context) => {
            const { reason } = context.args as { reason?: string | null };
            try {
                const options: Electron.OpenDialogOptions = {
                    properties: ["openDirectory", "createDirectory"],
                    ...(reason ? { title: reason, message: reason } : {}),
                };
                const window = BrowserWindow.getFocusedWindow();
                const { canceled, filePaths } = window
                    ? await dialog.showOpenDialog(window, options)
                    : await dialog.showOpenDialog(options);
                if (canceled || filePaths.length === 0) {
                    context.error("No folder was chosen.");
                    return;
                }
                context.return({ path: filePaths[0] });
            } catch (e) {
                context.error(e instanceof Error ? e.message : String(e));
            }
        },
        {
            key: "choose_directory",
            version: "1",
            name: "Choose a folder",
            kind: ActionKind.Function,
            args: [
                { key: "reason", kind: PortKind.String, nullable: true, description: "Why the folder is needed, shown in the dialog" },
            ],
            returns: [{ key: "path", kind: PortKind.String, nullable: false }],
            description: "Asks the person to choose a folder on this computer and returns its path.",
        }
    );
};
