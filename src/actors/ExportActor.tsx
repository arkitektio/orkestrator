import { useDatalayer } from "@jhnnsrs/datalayer";
import { invoke } from "@tauri-apps/api";
import { createDir } from "@tauri-apps/api/fs";
import { BaseDirectory, homeDir, join } from "@tauri-apps/api/path";
import React, { useEffect } from "react";
import { notEmpty } from "../floating/utils";
import { useMikro } from "../mikro/MikroContext";
import {
  DownloadFilesDocument,
  DownloadFilesQuery,
  DownloadFilesQueryVariables,
} from "../mikro/api/graphql";
import { useAgent } from "../rekuest/agent/AgentContext";
import { NodeKindInput, PortKindInput, Scope } from "../rekuest/api/graphql";

interface Props {}

export const ExportActor: React.FC<Props> = (props) => {
  const { config } = useDatalayer();
  const { register } = useAgent();
  const { client } = useMikro();
  const { s3resolve } = useDatalayer();

  const download = async (
    dir: string,
    files: { file: string; name: string }[],
    progress: (number: number) => Promise<void>
  ) => {
    let total = files.length;

    for (let [i, file] of files.entries()) {
      const path = await join(dir, file.name);
      console.log(path, file);
      try {
        let f = await invoke<string>("download_file", {
          file: path,
          url: s3resolve(file.file),
        });
        await progress((i / total) * 100);
      } catch (e) {
        console.error(e);
      }
    }

    return;
  };

  useEffect(() => {
    console.log("Registering");
    if (client && config && window.__TAURI__) {
      return register(
        "export-dataset",
        {
          name: "Export files in dataset",
          description: "Expirt files of dataset into orkestrator folder",
          args: [
            {
              key: "dataset",
              kind: PortKindInput.Structure,
              identifier: "@mikro/dataset",
              nullable: true,
              scope: Scope.Global,
            },
          ],
          kind: NodeKindInput.Function,
          returns: [],
          portGroups: [],
          interfaces: [],
        },
        () => ({
          onAssign: async (assignation) => {
            let id = assignation.assignation.args.at(0);
            if (!id) throw Error("No id provided");
            let query = await client.query<
              DownloadFilesQuery,
              DownloadFilesQueryVariables
            >({
              query: DownloadFilesDocument,
              variables: {
                dataset: id,
              },
            });
            let data = query.data.dataset?.omerofiles?.filter(notEmpty) || [];

            let homedir = await homeDir();
            let path = await join(homedir, "orkestrator", `Dataset ${id}`);
            let rel_path = await join("orkestrator", `Dataset ${id}`);
            console.log("Creating dir");
            try {
              await createDir(rel_path, { dir: BaseDirectory.Home });
            } catch {
              console.log("Path already exists?");
            }
            console.log("Starting download");
            await download(path, data, assignation.progress);
            await assignation.return([]);

            console.log("Assignation");
          },
        })
      );
    }
  }, [client, config]);

  return <></>;
};

export default ExportActor;
