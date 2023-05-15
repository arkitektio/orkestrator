import { useDatalayer } from "@jhnnsrs/datalayer";
import { invoke } from "@tauri-apps/api";
import { BaseDirectory, FileEntry, readDir } from "@tauri-apps/api/fs";
import React, { useEffect, useState } from "react";
import { PageLayout } from "../../layout/PageLayout";
import { useAgent } from "../../rekuest/agent/AgentContext";
import { NodeKindInput, PortKindInput, Scope } from "../../rekuest/api/graphql";
import { TauriGuard } from "../../tauri/guard";

interface Props {}

export const Test: React.FC<Props> = (props) => {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const { config } = useDatalayer();
  const { register } = useAgent();

  const upload = async (entry: FileEntry) => {
    if (!config) {
      throw Error("No client configured");
    }
    if (!entry.name) {
      throw Error("No client configured");
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

    console.log(f);
  };

  const listAppDir = async () => {
    let entries = await readDir("orkestrator", { dir: BaseDirectory.Home });
    console.log(entries);

    for (let entry of entries) {
      if (entry.children) {
      }
    }
    setEntries(entries);
  };

  useEffect(() => {
    listAppDir();
  }, []);

  useEffect(() => {
    register(
      {
        name: "Stream Files",
        description: "Stream files in the orkestrator folder",
        args: [],
        kind: NodeKindInput.Generator,
        returns: [
          {
            key: "file",
            kind: PortKindInput.Structure,
            identifier: "@mikro/file",
            nullable: false,
            scope: Scope.Global,
          },
        ],
        portGroups: [],
      },
      () => ({
        onAssign: async (assignation, controller) => {
          console.log("Assignation");
        },
      })
    );
  }, []);

  return (
    <TauriGuard>
      <PageLayout>
        {entries.map((e) => (
          <button onClick={() => upload(e)}> {e.path}</button>
        ))}
      </PageLayout>
    </TauriGuard>
  );
};

export default Test;
