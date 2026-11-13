import { useDialog } from "@/core/dialogs/registry";
import { useEffect } from "react";
import { setReportHandler } from "./requestReport";

/** Long enough for the menu the report was chosen from to be gone from the picture. */
const MENU_CLOSE_MS = 200;

const captureWindow = async (): Promise<string | null> => {
  if (!window.api?.diagnostics) return null;
  await new Promise((resolve) => setTimeout(resolve, MENU_CLOSE_MS));
  try {
    return await window.api.diagnostics.capture();
  } catch {
    return null;
  }
};

/**
 * Answers `requestReport`: takes a picture of the window as it is NOW, before
 * the dialog covers it, then opens the report dialog. Mounted once, inside
 * the dialog provider.
 */
export const ReportHost = () => {
  const { openDialog } = useDialog();
  useEffect(
    () =>
      setReportHandler(({ pinned }) => {
        void captureWindow().then((screenshot) => openDialog("reportproblem", { screenshot, pinned: pinned ?? null }));
      }),
    [openDialog],
  );
  return null;
};

export default ReportHost;
