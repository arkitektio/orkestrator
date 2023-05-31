import { useNavigate } from "react-router";
import { RunFragment, useExportRunLazyQuery } from "../../fluss/api/graphql";
import { withFluss } from "../../fluss/fluss";
import { ActionButton } from "../../layout/ActionButton";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { useTrackRiver } from "./context";

export interface EditActionsProps {
  run: RunFragment;
}

export const TrackActions = ({}: {}) => {
  const { run } = useTrackRiver();
  const navigate = useNavigate();

  const { ask } = useDialog();

  const [exportRun] = withFluss(useExportRunLazyQuery)();

  const onExport = async () => {
    let exportedRun = await exportRun({ variables: { id: run?.id } });

    let x = JSON.stringify(exportedRun.data, null, 4);
    // Download the file
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(x)
    );
    element.setAttribute("download", `${run?.assignation}.json`);

    element.style.display = "none";

    element.click();

    document.body.removeChild(element);
  };

  return (
    <>
      <ActionButton
        label="Export"
        description="Export this run"
        onAction={async () => {
          await onExport();
        }}
      />
    </>
  );
};
