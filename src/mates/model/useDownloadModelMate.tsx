import { useDatalayer } from "@jhnnsrs/datalayer";
import { BsDownload } from "react-icons/bs";
import { MateFinder } from "../types";

export const useDownloadModelMate = (): ((
  filepath: string | undefined
) => MateFinder) => {
  const { s3resolve } = useDatalayer();

  return (filepath: string | undefined) => async (options) =>
    options.partnersIncludeSelf
      ? [
          {
            action: async (event) => {
              filepath && window.open(s3resolve(filepath));
            },
            label: <BsDownload />,
            description: "Donwload this model",
          },
        ]
      : undefined;
};
