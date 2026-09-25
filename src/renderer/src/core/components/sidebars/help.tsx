import { Button } from "../ui/button"
import { ButtonGroup } from "../ui/button-group";
import { useReport } from "@/core/hooks/use-report";
import { useOpenDocs } from "@/core/hooks/use-open-docs";


export const HelpSidebar = (props: { help?: React.ReactNode }) => {

  const report = useReport();
  const openDocs = useOpenDocs();


  return (
    <div className="p-4 flex flex-col gap-2 h-full">
      <h2 className="text-lg font-semibold">Help & Documentation</h2>
      <p className="text-sm text-muted-foreground">
        Here you can find useful resources and documentation to assist you with using the application.
      </p>


      <div className="flex-grow overflow-y-auto">
        <div className="flex mt-4 p-4 rounded-lg border border-primary dark:bg-primary/10">
          {props.help || <>No additional help available.</>}
        </div>
      </div>

      <ButtonGroup orientation="horizontal" className="flex-initial w-full flex flex-row" >

        <Button variant="outline" onClick={openDocs} className="flex-1">
          Docs
        </Button>
        <Button variant="outline" onClick={report} className="flex-1">
          Report a Bug
        </Button>
      </ButtonGroup>
    </div>
  );
};
