import { Dialog, DialogContent } from "@/core/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ActionAssignForm } from "../forms/ActionAssignForm";

export const ActionButton = (props: {
  id: string;
  children: React.ReactNode;
}) => {
  return (
    <>
      <>
        <Dialog>
          <DialogTrigger asChild>{props.children}</DialogTrigger>
          <DialogContent className="text-foreground">
            <ActionAssignForm id={props.id} />
          </DialogContent>
        </Dialog>
      </>
    </>
  );
};
