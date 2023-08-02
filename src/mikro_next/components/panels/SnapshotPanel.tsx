import { useDatalayer } from "@jhnnsrs/datalayer";
import { SnapshotFragment } from "../../api/graphql";

const SnapshotPanel = ({ image }: { image: SnapshotFragment }) => {
  const { s3resolve } = useDatalayer();

  return (
    <>
      {image.store && (
        <img
          src={s3resolve(image.store.presignedUrl)}
          className="w-full h-full"
        />
      )}
    </>
  );
};

export default SnapshotPanel;
