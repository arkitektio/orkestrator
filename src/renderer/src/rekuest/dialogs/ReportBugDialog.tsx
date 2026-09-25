import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { PortKind, PostmanTaskFragment, useDetailTaskQuery } from "@/rekuest/api/graphql";
import { useWidgetRegistry } from "@/core/ports/engine/WidgetsContext";
import { WidgetRegistryType } from "@/core/ports/engine/types";
import { useEffect } from "react";

export interface ReportBugDialogProps {
  taskId: string; // Optional: if you want to fetch full details
}

/**
 * Format task data for the bug report
 */
async function formatTaskInfo(
  task: PostmanTaskFragment,
  registry: WidgetRegistryType,
  descriptions?: Record<string, Array<{ key: string; value: string }>>
): Promise<string> {
  const errorEvent = task.events.find(
    (e) => e.kind === "CRITICAL" || e.kind === "FAILED"
  );

  let info = `## Task Information\n\n`;
  info += `- **Action**: ${task.action.name}\n`;
  info += `- **Status**: ${task.latestEventKind}\n`;
  info += `- **Reference**: ${task.reference || "N/A"}\n`;
  info += `- **Created At**: ${new Date(task.createdAt).toISOString()}\n`;

  if (task.implementation) {
    info += `- **Implementation**: ${task.implementation.interface}\n`;
  }

  // Get descriptions if not provided
  const argDescriptions = descriptions || (await describeArgs(task, registry));

  info += `\n## Arguments\n\n`;

  // Show described arguments in a readable format with list of descriptors
  task.action.args.forEach((arg) => {
    const value = task.args[arg.key];
    const descriptorList = argDescriptions[arg.key] || [];

    info += `### ${arg.key}`;
    if (arg.identifier) {
      info += ` (${arg.identifier})`;
    }
    info += `\n\n`;

    // Show each descriptor in the list
    if (descriptorList.length > 0) {
      descriptorList.forEach((descriptor) => {
        if (descriptor.key && descriptor.value) {
          info += `- **${descriptor.key}**: ${descriptor.value}\n`;
        }
      });
    } else {
      info += `- **Raw value**: \`${JSON.stringify(value)}\`\n`;
    }

    info += `\n`;
  });

  info += `\n### Raw Arguments (JSON)\n\n`;
  info += `\`\`\`json\n${JSON.stringify(task.args, null, 2)}\n\`\`\`\n`;

  if (errorEvent) {
    info += `\n## Error Message\n\n`;
    info += `${errorEvent.message || "No error message provided"}\n`;
  }

  info += `\n## Event Timeline\n\n`;
  task.events.forEach((event, idx) => {
    info += `${idx + 1}. **${event.kind}** (${new Date(event.createdAt).toLocaleString()})`;
    if (event.message) {
      info += `: ${event.message}`;
    }
    info += `\n`;
  });

  return info;
}



export const describeArgs = async (
  task: PostmanTaskFragment,
  registry: WidgetRegistryType
): Promise<Record<string, Array<{ key: string; value: string }>>> => {
  const descriptions: Record<string, Array<{ key: string; value: string }>> = {};

  // Use Promise.all to wait for all async operations
  await Promise.all(
    task.action.args.map(async (arg) => {
      if (arg.kind === PortKind.Structure) {
        const assignWidget = arg.widget;

        if (assignWidget?.__typename === "SearchAssignWidget") {
          const ward = registry.getWard(assignWidget.ward);

          if (ward?.describe && task.args[arg.key]) {
            try {
              const desc = await ward.describe({
                identifier: arg.identifier,
                id: task.args[arg.key],
              });
              descriptions[arg.key] = Array.isArray(desc) ? desc : [{ key: "value", value: String(desc) }];
              console.log("Described", arg.key, desc);
            } catch (error) {
              console.error("Error describing arg:", arg.key, error);
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              descriptions[arg.key] = [
                { key: "describe_error", value: errorMessage },
                { key: "raw_value", value: String(task.args[arg.key]) }
              ];
            }
          } else {
            descriptions[arg.key] = [{ key: "value", value: String(task.args[arg.key]) }];
          }
        } else {
          descriptions[arg.key] = [{ key: "value", value: String(task.args[arg.key]) }];
        }
      } else {
        // For non-structure args, show the value directly
        descriptions[arg.key] = [{ key: "value", value: String(task.args[arg.key]) }];
      }
    })
  );

  return descriptions;
};






/**
 * Report a failed task. Rekuest knows the task and what it was called with;
 * the issue tracker belongs to the client that ran it, which is lok's. So this
 * prepares the report and hands it to lok's `reportclientbug` dialog, which
 * resolves the client by its OAuth id and files it.
 */
export const ReportBugDialog = ({ taskId }: ReportBugDialogProps) => {
  const { openDialog, closeDialog } = useDialog();
  const { registry } = useWidgetRegistry();
  const { data, loading } = useDetailTaskQuery({ variables: { id: taskId } });
  const task = data?.task;
  const clientId = task?.implementation?.agent?.client.clientId;

  useEffect(() => {
    if (!task || !clientId || !registry) return;
    let cancelled = false;
    formatTaskInfo(task, registry).then((context) => {
      if (cancelled) return;
      openDialog("reportclientbug", {
        clientId,
        report: {
          title: `Bug in ${task.action.name}: ${task.latestEventKind}`,
          subject: `the failed task "${task.action.name}"`,
          context,
          contextLabel: "Technical Details",
          labels: ["bug", "auto-reported"],
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [task, clientId, registry, openDialog]);

  return (
    <DialogHeader>
      <DialogTitle>Report Bug</DialogTitle>
      <div className="text-sm text-muted-foreground">
        {loading || (task && clientId)
          ? "Preparing the report…"
          : "Unable to load task details for reporting the bug."}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => closeDialog()}>
          Close
        </Button>
      </DialogFooter>
    </DialogHeader>
  );
};
