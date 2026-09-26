import { Archive, Ban, File, Flag, Folder, Inbox, Mails, Send, Trash2 } from "lucide-react";
import { FolderRole } from "../api/graphql";

export const FOLDER_ICON: Record<FolderRole, typeof Folder> = {
  [FolderRole.Inbox]: Inbox,
  [FolderRole.Sent]: Send,
  [FolderRole.Drafts]: File,
  [FolderRole.Trash]: Trash2,
  [FolderRole.Archive]: Archive,
  [FolderRole.Junk]: Ban,
  [FolderRole.All]: Mails,
  [FolderRole.Flagged]: Flag,
  [FolderRole.Other]: Folder,
};
