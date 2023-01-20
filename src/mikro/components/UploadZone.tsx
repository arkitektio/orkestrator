import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsDownload,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { ImCancelCircle } from "react-icons/im";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { useMikro, withMikro } from "../MikroContext";
import {
  MyOmeroFilesDocument,
  UploadOmeroFileMutationVariables,
  useUploadOmeroFileMutation,
} from "../api/graphql";
import { useConfirm } from "../../components/confirmer/confirmer-context";
export type IMyRepresentationsProps = {};

const limit = 20;

const hashFile = (file: File) => {
  return `${file.name}_${file.size}_${file.type}`;
};

export type UploadFuture = {
  hash: string;
  file: File;
  future: Promise<any>;
  controller: AbortController;
  progress?: number;
};

const UploadZone: React.FC<{
  uploadFile: ReturnType<typeof useUploadOmeroFileMutation>[0];
  additionalVariables?: Omit<UploadOmeroFileMutationVariables, "file">;
}> = ({ uploadFile, additionalVariables }) => {
  const [offset, setOffset] = useState(0);
  const [progress, setProgress] = useState(undefined);

  const [uploadFutures, setUploadFutures] = useState<UploadFuture[]>([]);
  const [pendingFutures, setPendingFutures] = useState<UploadFuture[]>([]);

  const { s3resolve } = useMikro();

  const [{ isOver, canDrop }, drop] = useDrop(() => {
    return {
      accept: [NativeTypes.FILE],
      drop: (item, monitor) => {
        const files: File[] = (item as any).files;
        console.log("files", files);
        const futures: UploadFuture[] = files.map((file: any, index) => {
          let abortController = new AbortController();

          let hash = hashFile(file);

          return {
            hash: hash,
            file: file,
            controller: abortController,
            future: uploadFile({
              variables: { file, ...additionalVariables },
              context: {
                fetchOptions: {
                  signal: abortController.signal,
                  onProgress: (ev: ProgressEvent) => {
                    setUploadFutures((prev) =>
                      prev.map((f) =>
                        f.hash === hash
                          ? { ...f, progress: ev.loaded / ev.total }
                          : f
                      )
                    );
                  },
                },
              },
            })
              .then((x) =>
                setUploadFutures((futures) =>
                  futures.filter((f) => f.hash !== hashFile(file))
                )
              )
              .catch((e) => {
                console.log("error", e);
                setUploadFutures((futures) =>
                  futures.filter((f) => f.hash !== hashFile(file))
                );
              }),
          };
        });

        setUploadFutures(futures);
        return {};
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    };
  }, []);

  const { confirm } = useConfirm();

  return (
    <>
      {uploadFutures.map((future, index) => (
        <div
          key={index}
          className="rounded shadow-xl group text-white bg-center bg-cover relative group"
          // style={{
          //   background: `center bottom linear-gradient(to right, rgba(255,0,0,0.75), rgba(255,0,0,0.95)) ${
          //     future.progress && future.progress * 100
          //   }%, linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95)) ${
          //     future.progress && (1 - future.progress) * 100
          //   }%`,
          // }}
          style={{
            background: `center bottom linear-gradient(to right, rgba(0,220,0,0.75) ${
              future.progress && Math.floor(future.progress * 100)
            }%, rgba(0,0,0,0.95) ${
              future.progress && Math.floor(future.progress * 100)
            }% ${future.progress && Math.floor((1 - future.progress) * 100)}%)`,
          }}
        >
          <div className="px-6 py-4">
            <div className="font-bold text-xl mb-2 cursor-pointer">
              {future.file.name}
            </div>
            <p className="text-white-700 text-base">
              {future.progress && Math.floor(future.progress * 100)}%
            </p>
          </div>
          <button
            className="hidden group-hover:block text-white-500 bg-red-500 rounded-md text px-2 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 b"
            onClick={() => future.controller.abort()}
          >
            x
          </button>
        </div>
      ))}
      <div
        className={`${
          !canDrop && "hidden"
        } bg-slate-300 p-4 rounded shadow-xl group bg-center bg-cover animate-all`}
        ref={drop}
      >
        {isOver ? "Release to upload" : "Drag and drop a file here"}
      </div>
    </>
  );
};

export { UploadZone };
