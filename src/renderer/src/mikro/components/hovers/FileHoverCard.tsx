import { Object } from "@/types";
import { useGetFileQuery } from "../../api/graphql";
import { HoverRow, HoverShell, HoverSkeleton } from "./HoverShell";

// Source - https://stackoverflow.com/q/10420352 (CC BY-SA 4.0)
function getReadableFileSizeString(fileSizeInBytes: number) {
  let i = -1;
  const byteUnits = [" kB", " MB", " GB", " TB", " PB", " EB", " ZB", " YB"];
  do {
    fileSizeInBytes /= 1024;
    i++;
  } while (fileSizeInBytes > 1024);

  return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

export const FileHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetFileQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load file details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const file = data.file;

  return (
    <HoverShell title={file.name} subtitle="File">
      <div className="flex flex-col gap-1">
        <HoverRow
          label="Size"
          value={
            file.size != null ? getReadableFileSizeString(file.size) : "—"
          }
        />
        {file.contentType && (
          <HoverRow label="Type" value={file.contentType} />
        )}
        {/* No "Origins" row: `File.origins` is gone from the mikro schema. */}
        <HoverRow label="Organization" value={file.organization.slug} />
      </div>

    </HoverShell>
  );
};

export default FileHoverCard;
