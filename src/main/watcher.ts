import { electronRegistry } from "./agent-registry";
import { ActionKind, PortKind } from "./schemas/rekuest";
import chokidar from "chokidar";
import { existsSync } from "fs";

export const registerWatcher = () => {
    electronRegistry.register(
        "watch_directory",
        async (context) => {


            console.log("Starting to watch directory:", context.args);
            const { path: watchPath } = context.args as { path: string };

            if (!existsSync(watchPath)) {
                context.error(`Directory does not exist: ${watchPath}`);
                return;
            }

            await new Promise<void>((resolve) => {
                try {
                    const watcher = chokidar.watch(watchPath, {
                        persistent: true,
                        ignoreInitial: true,
                        depth: 0
                    });

                    watcher.on('all', (event, filePath) => {
                        context.log("info", `File ${filePath} changed: ${event}`);
                        context.yield({ filename: filePath });
                    });

                    watcher.on('error', (error) => {
                        context.log("error", `Watcher error: ${error}`);
                        context.error(`Watcher error: ${error}`);
                    });

                    watcher.on('ready', () => {
                        context.log("info", "Watcher ready");
                    });

                    const onAbort = async () => {
                        await watcher.close();
                        context.log("info", "Stopped watching directory");
                        resolve();
                    };

                    if (context.signal.aborted) {
                        onAbort();
                    } else {
                        context.signal.addEventListener("abort", onAbort);
                    }

                } catch (e) {
                    console.error(e)
                    context.error(e instanceof Error ? e.message : String(e));
                    resolve();
                }
            });
        },
        {
            key: "watch_directory",
            version: "1",
            name: "watch_directory",
            kind: ActionKind.Generator,
            args: [{ key: "path", kind: PortKind.String, nullable: false }],
            returns: [
                { key: "filename", kind: PortKind.String, nullable: false }
            ],
            description: "Watch a directory for changes",
        }
    );
}
