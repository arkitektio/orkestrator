import { StreamItem } from "../../../fluss/api/graphql";

export const stream_to_label = (
  stream?: (StreamItem | null | undefined)[] | null
): string => {
  if (!stream) {
    return "";
  }
  return stream.map((item) => item?.kind).join(", ");
};
