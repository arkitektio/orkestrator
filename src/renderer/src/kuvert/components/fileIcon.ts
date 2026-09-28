import { File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo } from "lucide-react";

/** An icon for a MIME type (falling back to the file name's extension). */
export const fileIcon = (contentType?: string | null, name?: string | null) => {
  const type = (contentType ?? "").toLowerCase();
  const ext = (name ?? "").toLowerCase().split(".").pop() ?? "";
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  if (type.includes("pdf") || type.startsWith("text/") || ["pdf", "txt", "md", "doc", "docx"].includes(ext)) return FileText;
  if (type.includes("spreadsheet") || type.includes("csv") || ["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (type.includes("zip") || type.includes("compressed") || ["zip", "gz", "tar", "7z"].includes(ext)) return FileArchive;
  return File;
};

/** "PDF", "PNG", … — the short kind shown under a file's name. */
export const fileKind = (contentType?: string | null, name?: string | null) => {
  const ext = (name ?? "").split(".").pop();
  if (ext && ext !== name && ext.length <= 5) return ext.toUpperCase();
  return (contentType ?? "file").split("/").pop()?.toUpperCase() ?? "FILE";
};
