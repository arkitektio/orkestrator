import { useDialog } from "@/app/dialog";
import { ParagraphField } from "@/components/fields/ParagraphField";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { DetailClientFragment } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { clientAppIdentifier, clientAppVersion } from "@/lok/lib/clientLabels";

type ReportClientBugFormData = {
  title: string;
  description: string;
  additionalContext: string;
};

export interface ReportClientBugDialogProps {
  client: DetailClientFragment;
  issueUrl?: string;
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
 * Format client information for the bug report
 */
function formatClientInfo(client: DetailClientFragment): string {
  let info = `## Client Information\n\n`;
  info += `- **App**: ${clientAppIdentifier(client)}\n`;
  info += `- **Version**: ${client.release?.version ?? "N/A"}\n`;
  info += `- **User**: ${client.user?.username || "N/A"}\n`;
  info += `- **Client ID**: ${client.clientId}\n`;

  if (client.node) {
    info += `- **Node**: ${client.node.name}\n`;
  }

  info += `\n## Additional Information\n\n`;
  info += `- **Client Kind**: ${client.kind}\n`;

  if (client.node) {
    info += `\n## Node Information\n\n`;
    info += `- **Node Name**: ${client.node.name}\n`;
  }

  return info;
}

export const ReportClientBugDialog = ({
  client,
  issueUrl,
}: ReportClientBugDialogProps) => {
  const { closeDialog } = useDialog();

  const form = useForm<ReportClientBugFormData>({
    defaultValues: {
      title: `Bug in ${clientAppVersion(client)}`,
      description: "",
      additionalContext: formatClientInfo(client),
    },
  });

  const onSubmit = async (data: ReportClientBugFormData) => {
    const { title, description, additionalContext } = data;

    // Construct the full issue body
    let issueBody = description;
    if (description && additionalContext) {
      issueBody += "\n\n---\n\n";
    }
    issueBody += additionalContext;

    if (!issueUrl) {
      toast.error("No issue URL configured for this client");
      return;
    }

    try {
      // Build the GitHub issue URL
      const githubUrl = buildGitHubIssueUrl({
        baseUrl: issueUrl,
        title,
        body: issueBody,
        labels: ["bug", "client-reported"],
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
          <DialogTitle>Report Client Bug</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            Report a general bug for the client:{" "}
            <strong>{clientAppVersion(client)}</strong>
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
            label="Client Information"
            description="Auto-generated client information (you can edit this)"
            placeholder="Client details..."
          />

          {!issueUrl && (
            <div className="text-sm text-red-500">
              Warning: No issue URL configured for this client
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
            {form.formState.isSubmitting
              ? "Creating..."
              : "Create GitHub Issue"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
