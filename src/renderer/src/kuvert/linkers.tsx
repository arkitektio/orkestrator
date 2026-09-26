import { smartOf } from "@/core/smart/fromManifest";
import { manifest } from "./manifest";

// Kuvert's smart objects (Smart cards, links, pages), built from the models its
// manifest declares.

export const MailAccount = smartOf(manifest, "@kuvert/account");
export const MailFolder = smartOf(manifest, "@kuvert/folder");
export const MailThread = smartOf(manifest, "@kuvert/thread");
export const MailMessage = smartOf(manifest, "@kuvert/message");
export const OutgoingMail = smartOf(manifest, "@kuvert/outgoing");
