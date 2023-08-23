import { useDialog } from "./DialogProvider";

export const DialogDisplay = () => {
  const { component } = useDialog();

  return component ? <>{component}</> : <></>;
};
