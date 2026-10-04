import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { RekuestService, RekuestSignal, RekuestStructure, RekuestTask } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { PageAction } from "@/core/ui/page-action";
import { useSignalQuery } from "@/rekuest/api/graphql";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { RotateCcw, Zap } from "lucide-react";
import { RuleRow, RuleRows } from "../components/automation/AutomationDetail";
import { FiringsTable } from "../components/automation/FiringsTable";
import { signalDescriptors } from "../components/automation/SignalRow";
import { REKUEST_HELP } from "../help";

const shortValue = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));
const moment = (value: string) => new Date(value).toLocaleString();

/**
 * One signal: the object a service announced, what happened to it, what it
 * carried, and what became of every trigger that listened for it.
 */
export const SignalPage = asDetailQueryRoute(useSignalQuery, ({ data }) => {
  const signal = data.signal;
  const { openDialog } = useDialog();
  const descriptors = signalDescriptors(signal);
  const entries = Object.entries(descriptors);
  const title = `${signal.identifier} ${KIND_LABELS[signal.kind]}`;

  return (
    <RekuestSignal.ModelPage
      title={title}
      help={REKUEST_HELP.signal}
      object={signal}
      pageActions={
        <>
          <PageAction
            icon={<Zap className="h-4 w-4" />}
            onClick={() =>
              openDialog("createautomation", {
                kind: "signal",
                identifier: signal.identifier,
                signalKind: signal.kind,
                sample: descriptors,
              })
            }
            collapse="icon"
          >
            Run something on this
          </PageAction>
          <PageAction
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={() => openDialog("firetrigger", { signal: signal.id })}
            collapse="icon"
            priority={-10}
          >
            Fire a trigger…
          </PageAction>
        </>
      }
    >
      <div className="max-w-5xl space-y-8 p-6">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            <StructureDisplay
              identifier={signal.identifier}
              id={signal.object}
              variant="inline"
              link
              fallback={
                <span className="font-mono text-lg">
                  {signal.identifier} #{signal.object}
                </span>
              }
            />
          </h1>
          <span className="text-sm text-muted-foreground">was {KIND_LABELS[signal.kind]}</span>
        </header>

        <RuleRows>
          <RuleRow label="Structure">
            <RekuestStructure.DetailLink
              object={{ id: signal.identifier }}
              className="font-mono text-xs hover:underline"
            >
              {signal.identifier}
            </RekuestStructure.DetailLink>
            <span className="ml-2 text-xs text-muted-foreground">#{signal.object}</span>
          </RuleRow>
          <RuleRow label="Service">
            {/* a sender the hub no longer catalogues is only a name */}
            {signal.service ? (
              <RekuestService.DetailLink object={signal.service} className="hover:underline">
                {signal.service.name}
              </RekuestService.DetailLink>
            ) : (
              signal.serviceName
            )}
          </RuleRow>
          {signal.occurredAt && <RuleRow label="Occurred">{moment(signal.occurredAt)}</RuleRow>}
          <RuleRow label="Received">{moment(signal.receivedAt)}</RuleRow>
          <RuleRow label="Matched">
            {signal.processedAt ? moment(signal.processedAt) : "Waiting for triggers to be matched"}
          </RuleRow>
          {signal.causingTask && (
            <RuleRow label="From">
              <RekuestTask.DetailLink object={signal.causingTask} className="hover:underline">
                {signal.causingTask.action.name}
              </RekuestTask.DetailLink>
            </RuleRow>
          )}
          {entries.length > 0 && (
            <RuleRow label="With">
              <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1">
                {entries.map(([key, value]) => (
                  <div key={key} className="contents">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="min-w-0 truncate font-mono text-xs leading-5">
                      {shortValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </RuleRow>
          )}
        </RuleRows>

        <FiringsTable firings={signal.firings} hide="signal" />
      </div>
    </RekuestSignal.ModelPage>
  );
});

export default SignalPage;
