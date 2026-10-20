import { linkBuilder } from "@/core/smart/builder";
import { smartRegistry } from "@/core/smart/registry";
import { ActionKind, PortKind } from "@/rekuest/api/graphql";
import { DialogDismissedError } from "@/core/dialogs/DialogProvider";
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
