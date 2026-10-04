import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestWiregram } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { PageAction } from "@/core/ui/page-action";
import { useWiregramQuery } from "@/rekuest/api/graphql";
import { scheduleRow, sortAutomations, triggerRow } from "@/rekuest/lib/automation";
import { useRuleUpdates } from "@/rekuest/lib/automationUpdates";
import { downloadWiregram } from "@/rekuest/lib/wiregram";
import { Download, Upload } from "lucide-react";
import { useMemo } from "react";
import { RuleRow, RuleRows } from "../components/automation/AutomationDetail";
import AutomationRowItem from "../components/automation/AutomationRow";
import { REKUEST_HELP } from "../help";

/**
 * One imported document and the rules it owns. The document itself is in
 * the sidebar, as it was last imported.
 */
export const WiregramPage = asDetailQueryRoute(useWiregramQuery, ({ data, refetch }) => {
  const wiregram = data.wiregram;
  const { openDialog } = useDialog();
  useRuleUpdates(() => refetch());

  const rows = useMemo(
    () =>
      sortAutomations([
        ...wiregram.schedules.map((schedule) => scheduleRow(schedule)),
        ...wiregram.triggers.map(triggerRow),
      ]),
    [wiregram.schedules, wiregram.triggers],
  );

  return (
    <RekuestWiregram.ModelPage
      title={wiregram.name}
      help={REKUEST_HELP.wiregram}
      object={wiregram}
      pageActions={
        <>
          <PageAction
            icon={<Download className="h-4 w-4" />}
            onClick={() => downloadWiregram(wiregram.key, wiregram.document)}
            collapse="icon"
          >
            Download
          </PageAction>
          <PageAction
            icon={<Upload className="h-4 w-4" />}
            onClick={() => openDialog("importwiregram", { document: wiregram.document })}
            collapse="icon"
            priority={-10}
          >
            Import again…
          </PageAction>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Document">
            <pre className="overflow-auto p-3 font-mono text-xs leading-5">
              {JSON.stringify(wiregram.document, null, 2)}
            </pre>
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="max-w-3xl space-y-8 p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{wiregram.name}</h1>
          {wiregram.description && (
            <p className="mt-2 text-sm text-muted-foreground">{wiregram.description}</p>
          )}
        </header>

        <RuleRows>
          <RuleRow label="Key">
            <span className="font-mono text-xs">{wiregram.key}</span>
          </RuleRow>
          {wiregram.caller.user.sub && (
            <RuleRow label="Runs as">
              <StructureDisplay identifier="@lok/user" id={wiregram.caller.user.sub} variant="inline" />
            </RuleRow>
          )}
          <RuleRow label="Imported">{new Date(wiregram.updatedAt).toLocaleString()}</RuleRow>
        </RuleRows>

        {rows.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium">Automations</h2>
            <div className="-mx-2 flex flex-col gap-0.5">
              {rows.map((row) => (
                <AutomationRowItem key={`${row.kind}:${row.id}`} row={row} />
              ))}
            </div>
          </section>
        )}
      </div>
    </RekuestWiregram.ModelPage>
  );
});

export default WiregramPage;
