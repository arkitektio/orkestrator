import {
  RekuestAction,
  RekuestAgent,
  RekuestImplementation,
  RekuestResolution,
  RekuestSchedule,
  RekuestSpace,
  RekuestTask,
  RekuestTrigger,
} from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { CopyButton } from "@/core/ui/copy-button";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import type { ReactNode } from "react";
import { TaskPolicy, type DetailTaskFragment } from "../api/graphql";
import {
  eventKindColor,
  formatEventKind,
  TaskStatusIcon,
} from "../lib/taskStatus";
import { formatDuration, getEndTime } from "../lib/taskTimeline";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs font-semibold">{title}</div>
    {children}
  </div>
);

/** A muted label and its value, aligned with every other row in the rail. */
const Row = ({ label, children, title }: { label: string; children: ReactNode; title?: string }) => (
  <div className="flex min-w-0 items-baseline gap-2" title={title}>
    <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate text-xs">{children}</span>
  </div>
);

/** An id to copy: shortened in the row, whole on hover and on the clipboard. */
const CopyRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={value}>
      {value}
    </span>
    <CopyButton value={value} title={`Copy ${label.toLowerCase()}`} />
  </div>
);

const LINK = "hover:underline";

/**
 * What the task IS: what it ran, where it stands, who asked for it, where it
 * ran and how long it took. All from the page's own query — the task page's
 * counterpart of the agent page's `AgentFacts`.
 *
 * A fragment's worth of sections with no container of its own: the caller
 * decides the column and the padding. A row with nothing to say is left out
 * rather than shown empty.
 */
export const TaskFacts = ({ task }: { task: DetailTaskFragment }) => {
  const agent = task.implementation?.agent;
  const deviceId = agent?.client.device?.deviceId;
  const walltime = formatDuration(getEndTime(task) - new Date(task.createdAt).getTime());
  const root = task.root && task.root.id !== task.parent?.id && task.root.id !== task.id ? task.root : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <RekuestAction.DetailLink object={task.action} className={cn("break-all text-lg font-semibold", LINK)}>
          {task.action.name}
        </RekuestAction.DetailLink>
        {task.latestMessage && (
          <p className="text-sm text-muted-foreground">{task.latestMessage}</p>
        )}
      </div>

      <Section title="Status">
        <div className="flex items-center gap-2 text-xs">
          <TaskStatusIcon kind={task.latestEventKind} isDone={task.isDone} className="h-3.5 w-3.5 shrink-0" />
          <span className={cn("font-medium", eventKindColor(task.latestEventKind))}>
            {formatEventKind(task.latestEventKind)}
          </span>
          {!task.isDone && task.latestProgress != null && (
            <span className="tabular-nums text-muted-foreground">{task.latestProgress}%</span>
          )}
        </div>
      </Section>

      <Section title="Timing">
        <Row label="Started">
          <Timestamp date={task.createdAt} relative />
        </Row>
        {task.finishedAt && (
          <Row label="Finished">
            <Timestamp date={task.finishedAt} relative />
          </Row>
        )}
        <Row label="Walltime">
          <span className="tabular-nums">{task.isDone ? walltime : `${walltime} so far`}</span>
        </Row>
        {task.notBefore && (
          <Row label="Not before">
            <Timestamp date={task.notBefore} relative />
          </Row>
        )}
        <Row label="Events">{task.events.length}</Row>
      </Section>

      <Section title="Started by">
        {task.caller && (
          <>
            <Row label="User">
              <StructureDisplay identifier="@lok/user" id={task.caller.user.sub} variant="inline" />
            </Row>
            <Row label="Client">
              <StructureDisplay
                identifier="@lok/client"
                by="clientId"
                id={task.caller.client.clientId}
                variant="inline"
              />
            </Row>
          </>
        )}
        {task.schedule && (
          <Row label="Schedule">
            <RekuestSchedule.DetailLink object={task.schedule} className={LINK}>
              {task.schedule.name}
            </RekuestSchedule.DetailLink>
          </Row>
        )}
        {task.trigger && (
          <Row label="Trigger">
            <RekuestTrigger.DetailLink object={task.trigger} className={LINK}>
              {task.trigger.name}
            </RekuestTrigger.DetailLink>
          </Row>
        )}
        {task.parent && (
          <Row label="Parent">
            <RekuestTask.DetailLink object={task.parent} className={LINK}>
              Open parent task
            </RekuestTask.DetailLink>
          </Row>
        )}
        {root && (
          <Row label="Root">
            <RekuestTask.DetailLink object={root} className={LINK}>
              Open root task
            </RekuestTask.DetailLink>
          </Row>
        )}
      </Section>

      {(agent || task.space || task.resolution) && (
        <Section title="Runs on">
          {agent && (
            <Row label="Agent">
              <RekuestAgent.DetailLink object={agent} className={LINK}>
                {agent.name}
              </RekuestAgent.DetailLink>
            </Row>
          )}
          {task.implementation && (
            <Row label="Interface">
              <RekuestImplementation.DetailLink object={task.implementation} className={cn("font-mono", LINK)}>
                {task.implementation.interface}
              </RekuestImplementation.DetailLink>
            </Row>
          )}
          {deviceId && (
            <Row label="Device" title={deviceId}>
              <span className="font-mono">{deviceId}</span>
            </Row>
          )}
          {task.space && (
            <Row label="Space">
              <RekuestSpace.DetailLink object={task.space} className={LINK}>
                {task.space.name}
              </RekuestSpace.DetailLink>
            </Row>
          )}
          {task.resolution && (
            <Row label="Resolution">
              <RekuestResolution.DetailLink object={task.resolution} className={LINK}>
                {task.resolution.name}
              </RekuestResolution.DetailLink>
            </Row>
          )}
        </Section>
      )}

      <Section title="How">
        <Row label="Policy" title="Ask: calls it makes wait for your approval. Auto: they run without asking.">
          {task.policy === TaskPolicy.Auto ? "Auto" : "Ask"}
        </Row>
        {task.capture && <Row label="Capture">On</Row>}
        {task.children.length > 0 && <Row label="Calls">{task.children.length}</Row>}
      </Section>

      {task.heldLocks.length > 0 && (
        <Section title="Holds">
          <div className="flex flex-wrap gap-1">
            {task.heldLocks.map((lock) => (
              <span key={lock.id} className="rounded-full border px-2 py-0.5 font-mono text-[10px]">
                {lock.key}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Pages">
        <Row label="Logs">
          <RekuestTask.DetailLink
            object={task}
            subroute="log"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Show logs
          </RekuestTask.DetailLink>
        </Row>
      </Section>

      <Section title="Ids">
        <CopyRow label="Task" value={task.id} />
        {task.reference && <CopyRow label="Reference" value={task.reference} />}
      </Section>
    </>
  );
};

export default TaskFacts;
