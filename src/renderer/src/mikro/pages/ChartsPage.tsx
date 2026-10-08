import { useDialog } from "@/core/dialogs/registry";
import { Explainer } from "@/core/layout/Explainer";
import { MikroChart } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { PlusIcon } from "lucide-react";
import ChartList from "../components/lists/ChartList";
import { MIKRO_HELP } from "../help";

const Page = () => {
  const { openDialog } = useDialog();

  return (
    <MikroChart.ListPage
      title="Charts"
      help={MIKRO_HELP.charts}
      pageActions={
        <>
          <PageAction
            alwaysShow
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => openDialog("createchart", {}, { size: "medium" })}
          >
            New
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Charts"
          description="A chart lays data out along one axis, such as time or wavelength, and reads values off it: arrays as traces, table columns as series, and marks you draw."
        />
        <ChartList defaultLimit={40} />
      </div>
    </MikroChart.ListPage>
  );
};

export default Page;
