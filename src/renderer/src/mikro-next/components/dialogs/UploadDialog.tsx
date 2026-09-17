import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Database, File, Image, Upload, X } from "lucide-react";
import React, { useRef, useState } from "react";

export interface UploadDialogProps {
  children: React.ReactNode;
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  children,
  onFilesSelected,
  acceptedFileTypes = "*/*",
  multiple = true,
  maxFiles = 10,
}) => {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const limitedFiles = multiple
      ? fileArray.slice(0, maxFiles)
      : [fileArray[0]];
    setSelectedFiles(limitedFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      setSelectedFiles([]);
      setOpen(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedFiles([]);
      setDragOver(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="h-5 w-5 text-chart-3" />;
    } else if (
      file.type.includes("dataset") ||
      file.type.includes("csv") ||
      file.type.includes("json")
    ) {
      return <Database className="h-5 w-5 text-green-500" />;
    } else {
      return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </DialogTitle>
          <DialogDescription>
            Select files to upload to your workspace. You can drag and drop
            files or click to browse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-chart-3 bg-chart-3/10 dark:bg-chart-3/20"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {dragOver ? "Drop files here" : "Upload your files"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here or click to browse
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={acceptedFileTypes}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
