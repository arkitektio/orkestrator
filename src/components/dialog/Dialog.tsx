import { useDialog } from "../../providers/dialog/DialogProvider";

export const DialogDisplay = () => {
  const { component } = useDialog();

  return component ? <>{component}</> : <></>;
};
