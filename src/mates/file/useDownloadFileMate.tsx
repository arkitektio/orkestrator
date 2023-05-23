import { useDatalayer } from "@jhnnsrs/datalayer";
import { BsDownload } from "react-icons/bs";
import { MateFinder } from "../types";

export const useDownloadFileMate = (): ((
  filepath: string | undefined
) => MateFinder) => {
  const { s3resolve } = useDatalayer();

  return (filepath: string | undefined) => (type, isSelf) =>
    isSelf
      ? [
          {
            action: async (self, partner) => {
              filepath && window.open(s3resolve(filepath));
            },
            label: <BsDownload />,
            description: "Donwload this file",
          },
        ]
      : undefined;
};
