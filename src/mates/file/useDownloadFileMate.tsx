import { useDatalayer } from "@jhnnsrs/datalayer";
import { BsDownload } from "react-icons/bs";
import { MateFinder } from "../types";

export const useDownloadFileMate = (): ((filepath: string) => MateFinder) => {
  const { s3resolve } = useDatalayer();

  return (filepath: string) => (type, isSelf) =>
    isSelf
      ? [
          {
            action: async (self, partner) => {
              window.open(s3resolve(filepath));
            },
            label: <BsDownload />,
            description: "Donwload this file",
          },
        ]
      : undefined;
};
