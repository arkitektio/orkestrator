import { useDialog } from "@/app/dialog";
import { ParagraphField } from "@/components/fields/ParagraphField";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { DetailClientFragment, useClientQuery } from "@/lok/api/graphql";
import { DetailTaskFragment, PortKind, PostmanTaskFragment, useDetailTaskQuery } from "@/rekuest/api/graphql";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";
import { WidgetRegistryType } from "@/lib/ports/types";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type ReportBugFormData = {
  title: string;
  description: string;
  additionalContext: string;
};

export interface ReportBugDialogProps {
  taskId: string; // Optional: if you want to fetch full details
}

/**
 * Build a GitHub issue URL with pre-filled information
 */
function buildGitHubIssueUrl({
  baseUrl,
  title,
  body,
  labels,
}: {
  baseUrl: string;
  title: string;
  body: string;
  labels?: string[];
}): string {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (body) params.set("body", body);
  if (labels?.length) params.set("labels", labels.join(","));
  return `${baseUrl}?${params.toString()}`;
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






export const ReportBugDialog = ({ taskId }: ReportBugDialogProps) => {
  const { closeDialog } = useDialog();


  // Optionally fetch full task details if only ID is provided
  const { data: detailData } = useDetailTaskQuery({
    variables: { id: taskId },
  });

  const { data: clientData } = useClientQuery({
    variables: {
      clientId: detailData?.task?.implementation?.agent?.client.clientId || "",

    }
  })


  if (!detailData?.task || !clientData?.client) {
    return (
      <DialogHeader>
        <DialogTitle>Report Bug</DialogTitle>
        <div className="text-sm text-red-500">
          Unable to load task details for reporting the bug.
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => closeDialog()}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogHeader>
    );
  }

  return (
    <ReportBugDialogInner
      task={detailData.task}
      client={clientData.client}
    />
  );
}










export const ReportBugDialogInner = ({ task, client }: { task: DetailTaskFragment, client: DetailClientFragment }) => {
  const { closeDialog } = useDialog();
  const { registry } = useWidgetRegistry();

  const issueUrl = client?.issueUrl || "";

  const form = useForm<ReportBugFormData>({
    defaultValues: {
      title: `Bug in ${task?.action.name}: ${task?.latestEventKind}`,
      description: "",
      additionalContext: "Loading argument descriptions...",
    },
  });

  // Update form when task data changes - now async
  useEffect(() => {
    if (task && registry) {
      formatTaskInfo(task, registry).then((info) => {
        form.setValue("additionalContext", info);
      });
    }
  }, [task, registry, form]);

  const onSubmit = async (data: ReportBugFormData) => {
    const { title, description, additionalContext } = data;

    // Construct the full issue body
    let issueBody = description;
    if (description && additionalContext) {
      issueBody += "\n\n---\n\n";
    }
    issueBody += additionalContext;

    if (!issueUrl) {
      toast.error("No issue URL configured for this task");
      return;
    }

    try {
      // Build the GitHub issue URL
      const githubUrl = buildGitHubIssueUrl({
        baseUrl: issueUrl,
        title,
        body: issueBody,
        labels: ["bug", "auto-reported"],
      });

      // Open the GitHub issue creation page in a new window
      window.api.openWebbrowser(githubUrl);

      toast.success("Opening GitHub issue page...");
      closeDialog();
    } catch (error) {
      console.error("Error creating bug report:", error);
      toast.error("Failed to create bug report");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Report Bug</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            Report a bug for the failed task: <strong>{task?.action.name}</strong>
          </div>

          <StringField
            name="title"
            label="Issue Title"
            description="A brief title for the bug report"
            placeholder="Enter issue title..."
          />

          <ParagraphField
            name="description"
            label="Description"
            description="Describe what happened and what you expected to happen"
            placeholder="Enter bug description..."
          />

          <ParagraphField
            name="additionalContext"
            label="Technical Details"
            description="Auto-generated technical information (you can edit this)"
            placeholder="Technical details..."
          />

          {!issueUrl && (
            <div className="text-sm text-red-500">
              Warning: No issue URL configured for this task
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => closeDialog()}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !issueUrl}
          >
            {form.formState.isSubmitting ? "Creating..." : "Create GitHub Issue"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
