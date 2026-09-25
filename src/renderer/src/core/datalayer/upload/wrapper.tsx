import { UploadOptions } from "@/core/datalayer/hooks/useUpload";
import { useUpload } from "@/core/datalayer/UploadProvider";
import { acceptsFiles } from "@/core/dnd/files";
import { useDropTarget } from "@/core/dnd/react";

export type ElectronFile = File & { path: string };

export type UploadFunc = (
  file: ElectronFile,
  options: UploadOptions,
) => Promise<string>;
export type CreateFunc = (file: ElectronFile, key: string) => Promise<any>;

export const UploadWrapper = ({ uploadFile, createFile, children }: {
  uploadFile: UploadFunc;
  createFile: CreateFunc;
  children: React.ReactNode;
}) => {
  const { startUpload } = useUpload();

  const { ref, isOver } = useDropTarget({
    accepts: acceptsFiles,
    onDrop: (payload) => {
      if (payload.origin !== "external") return;
      // The browser's own File objects: `window.api.getFilePath` needs them.
      payload.files.forEach((file) => {
        startUpload(
          file,
          async (file, { id, onProgress, signal }) => {
            return await uploadFile(file as ElectronFile, { id, onProgress, signal });
          },
          async (file, key) => {
            return await createFile(file as ElectronFile, key);
          }
        ).catch(console.error);
      });
    },
  });

  return (
    <div className="w-full h-full relative" ref={ref}>
      {isOver && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <p className="text-2xl font-semibold text-primary">Drop files to upload</p>
        </div>
      )}
      {children}
    </div>
  );
};
