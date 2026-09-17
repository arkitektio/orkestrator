import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ReserveForm } from "../forms/ShortcutForm";

export const ReserveActionButton = (props: {
  id: string;
  children: React.ReactNode;
}) => {
  return (
    <>
      <>
        <Dialog>
          <DialogTrigger asChild>{props.children}</DialogTrigger>
          <DialogContent className="text-foreground">
            <ReserveForm id={props.id} />
          </DialogContent>
        </Dialog>
      </>
    </>
  );
};
