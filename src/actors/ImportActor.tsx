import { useDatalayer } from "@jhnnsrs/datalayer";
import { invoke } from "@tauri-apps/api";
import { BaseDirectory, FileEntry, readDir } from "@tauri-apps/api/fs";
import React, { useEffect } from "react";
import { useMikro } from "../mikro/MikroContext";
import {
  UploadBigFileDocument,
  UploadBigFileMutation,
  UploadBigFileMutationVariables,
} from "../mikro/api/graphql";
import { useAgent } from "../rekuest/agent/AgentContext";
import { NodeKindInput, PortKindInput, Scope } from "../rekuest/api/graphql";

interface Props {}

export const ImportActor: React.FC<Props> = (props) => {
  const { config } = useDatalayer();
  const { register } = useAgent();
  const { client } = useMikro();

  const upload = async (entry: FileEntry, dataset?: string) => {
    if (!config) {
      throw Error("No Datalayer configured");
    }
    if (!entry.name) {
      throw Error("No Fileentry configured");
    }

    let z = await config.presign(entry.name);

    let f = await invoke<string>("upload_file", {
      file: entry.path,
      url: `${config?.endpointUrl}/${z.bucket}`,
      key: z.fields.key,
      bucket: z.bucket,
      amzAlgorithm: z.fields.xAmzAlgorithm,
      amzCredential: z.fields.xAmzCredential,
      amzDate: z.fields.xAmzDate,
      amzSignature: z.fields.xAmzSignature,
      policy: z.fields.policy,
    });

    let result = await client?.mutate<
      UploadBigFileMutation,
      UploadBigFileMutationVariables
    >({
      mutation: UploadBigFileDocument,
      variables: {
        file: f,
        datasets: dataset ? [dataset] : [],
      },
    });
    return result?.data?.uploadBigFile?.id;
  };

  useEffect(() => {
    console.log("Registering");
    if (client && config && window.__TAURI__) {
      return register(
        "streams-file-in-dataset",
        {
          name: "Stream Files into Dataset",
          description: "Stream files in the orkestrator folder",
          args: [
            {
              key: "dataset",
              kind: PortKindInput.Structure,
              identifier: "@mikro/dataset",
              nullable: true,
              scope: Scope.Global,
            },
          ],
          kind: NodeKindInput.Generator,
          returns: [
            {
              key: "file",
              kind: PortKindInput.Structure,
              identifier: "@mikro/omerofile",
              nullable: false,
              scope: Scope.Global,
            },
          ],
          portGroups: [],
          interfaces: [],
        },
        () => ({
          onAssign: async (assignation) => {
            let entries = await readDir("orkestrator", {
              dir: BaseDirectory.Home,
            });
            console.log(entries);

            for (let entry of entries) {
              if (!entry.children) {
                console.log("Uploading");
                assignation.yield([
                  await upload(entry, assignation.assignation.args.at(0)),
                ]);
              }
            }

            assignation.done();

            console.log("Assignation");
          },
        })
      );
    }
  }, [client, config]);

  return <></>;
};

export default ImportActor;
