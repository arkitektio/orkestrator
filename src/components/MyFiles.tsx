import React, { useEffect, useState } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { MikroFile } from "../linker";
import { useDeleteFileMate } from "../mates/file/useDeleteFileMate";
import { useDownloadFileMate } from "../mates/file/useDownloadFileMate";
import { withMikro } from "../mikro/MikroContext";
import {
  MyOmeroFilesDocument,
  useMyOmeroFilesQuery,
  useUploadOmeroFileMutation,
} from "../mikro/api/graphql";
import { FileCard } from "../mikro/components/cards/FileCard";
import { DataHomeFilterParams } from "../mikro/pages/Home";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
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

const MyFiles: React.FC<IMyRepresentationsProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const [offset, setOffset] = useState(0);

  const [uploadFutures, setUploadFutures] = useState<UploadFuture[]>([]);

  const variables = { limit: limit, offset: 0, createdDay: createdDay };

  const {
    data,
    loading: all_loading,
    refetch,
  } = withMikro(useMyOmeroFilesQuery)({
    variables,
    //pollInterval: 1000,
  });

  const downloadFile = useDownloadFileMate();
  const deleteFile = useDeleteFileMate();

  const [uploadFile] = withMikro(useUploadOmeroFileMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: MyOmeroFilesDocument,
        variables,
      });
      cache.writeQuery({
        query: MyOmeroFilesDocument,
        variables,
        data: {
          myomerofiles: existing.myomerofiles.concat(
            result.data?.uploadOmeroFile
          ),
        },
      });
    },
  });

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
              variables: { file },
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

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  return (
    <div>
      <SectionTitle>
        <div className="flex flex-row">
          <MikroFile.ListLink className="flex-0">Files</MikroFile.ListLink>
          <div className="flex-grow"></div>
          <div className="flex-0">
            {offset != 0 && (
              <button
                type="button"
                className="p-1 text-gray-600 rounded"
                onClick={() => setOffset(offset - limit)}
              >
                {" "}
                <BsCaretLeft />{" "}
              </button>
            )}
            {data?.myomerofiles && data?.myomerofiles.length == limit && (
              <button
                type="button"
                className="p-1 text-gray-600 rounded"
                onClick={() => setOffset(offset + limit)}
              >
                {" "}
                <BsCaretRight />{" "}
              </button>
            )}
          </div>
        </div>
      </SectionTitle>
      <ResponsiveContainerGrid>
        {data?.myomerofiles?.filter(notEmpty).map((file) => (
          <FileCard
            file={file}
            mates={[deleteFile(file), downloadFile(file.file)]}
          />
        ))}

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
              }% ${
                future.progress && Math.floor((1 - future.progress) * 100)
              }%)`,
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
              type="button"
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
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyFiles };
