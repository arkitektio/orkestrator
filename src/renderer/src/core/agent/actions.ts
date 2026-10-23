import { linkBuilder } from "@/core/smart/builder";
import { smartRegistry } from "@/core/smart/registry";
import { ActionKind, PortKind } from "@/rekuest/api/graphql";
import { DialogDismissedError } from "@/core/dialogs/DialogProvider";
import { requestExport } from "@/core/modules/export/exportRequests";
import { toast } from "@/core/notify";
import { globalRegistry } from "./registry";

/**
 * What other apps may ask of the person at this window: the actions this app
 * offers as an agent, while it is engaged.
 *
 * An app finds them among its callers (rekuest's `callerOf`) by their ports,
 * never by name, so the ports here are the contract: `request_approval` is
 * what kabinet's `kabinet.callers.REQUEST_APPROVAL` demands. Like any child, a
 * call here is held until the person agrees to be asked (unless the run is in
 * auto-mode); the dialog itself is the rest of their answer.
 */

globalRegistry.register(
  "request_approval",
  async (context) => {
    const { release, agent } = context.args as { release: string; agent: string };
    try {
      const approval = await context.ui.awaitDialog<string>("installrelease", { release, agent });
      context.return({ approval });
    } catch (error) {
      context.error(
        error instanceof DialogDismissedError
          ? "The release was not approved: the dialog was closed."
          : error instanceof Error
            ? error.message
            : String(error),
      );
    }
  },
  {
    key: "request_approval",
    version: "1",
    name: "Request approval",
    description:
      "Asks the person to approve a release for a deployer (a lok mandate, recorded as a kabinet approval) and returns the approval they made.",
    kind: ActionKind.Function,
    args: [
      { key: "release", kind: PortKind.Structure, identifier: "@kabinet/release", nullable: false },
      { key: "agent", kind: PortKind.String, nullable: false, description: "The deployer app the approval names" },
    ],
    returns: [{ key: "approval", kind: PortKind.Structure, identifier: "@kabinet/approval", nullable: false }],
  },
);

globalRegistry.register(
  "open_in_separate_window",
  async (context) => {
    const { image } = context.args as { image: string };
    const path = smartRegistry.findModel("@mikro/image")?.path;
    if (!path) {
      context.error("This app cannot show images.");
      return;
    }
    context.ui.openWindow(linkBuilder(path)(image));
    context.return({});
  },
  {
    key: "open_in_separate_window",
    version: "1",
    name: "Open in separate window",
    description: "Opens an image in a window of its own, beside the main one.",
    kind: ActionKind.Function,
    args: [{ key: "image", kind: PortKind.Structure, identifier: "@mikro/image", nullable: false }],
    returns: [],
  },
);

globalRegistry.register(
  "upload_file",
  async (context) => {
    const { folder, reason } = context.args as { folder?: string | null; reason?: string | null };
    try {
      const file = await context.ui.awaitDialog<string>("agentuploadfile", { folder, reason });
      context.return({ file });
    } catch (error) {
      context.error(
        error instanceof DialogDismissedError
          ? "No file was uploaded: the dialog was closed."
          : error instanceof Error
            ? error.message
            : String(error),
      );
    }
  },
  {
    key: "upload_file",
    version: "1",
    name: "Upload a file",
    description:
      "Asks the person to choose a file, uploads it (into the folder, when one is given) and returns the uploaded file.",
    kind: ActionKind.Function,
    args: [
      { key: "folder", kind: PortKind.Structure, identifier: "@mikro/folder", nullable: true, description: "The folder to upload into; the default folder when left out" },
      { key: "reason", kind: PortKind.String, nullable: true, description: "Why the file is needed, shown to the person" },
    ],
    returns: [{ key: "file", kind: PortKind.Structure, identifier: "@mikro/file", nullable: false }],
  },
);

globalRegistry.register(
  "download_file",
  async (context) => {
    const { file } = context.args as { file: string };
    // The app's own export path: the download rail shows it and owns it from here.
    requestExport([{ identifier: "@mikro/file", id: file }]);
    context.return({});
  },
  {
    key: "download_file",
    version: "1",
    name: "Download a file",
    description: "Saves a file to the person's disk. Returns once the download has started.",
    kind: ActionKind.Function,
    args: [{ key: "file", kind: PortKind.Structure, identifier: "@mikro/file", nullable: false }],
    returns: [],
  },
);

globalRegistry.register(
  "notify",
  async (context) => {
    const { title, message } = context.args as { title: string; message?: string | null };
    toast(title, message ? { description: message } : undefined);
    // Behind other windows the toast goes unseen: say it on the desktop too.
    if (!document.hasFocus() && typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, message ? { body: message } : undefined);
    }
    context.return({});
  },
  {
    key: "notify",
    version: "1",
    name: "Notify",
    description: "Shows the person a message, and a desktop notification when the app is in the background.",
    kind: ActionKind.Function,
    args: [
      { key: "title", kind: PortKind.String, nullable: false },
      { key: "message", kind: PortKind.String, nullable: true },
    ],
    returns: [],
  },
);
