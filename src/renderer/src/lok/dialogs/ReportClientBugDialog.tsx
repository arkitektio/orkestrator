import { useDialog } from "@/core/dialogs/registry";
import { ParagraphField } from "@/core/components/fields/ParagraphField";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { DetailClientFragment, useClientQuery } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { clientAppIdentifier, clientAppVersion } from "@/lok/lib/clientLabels";

type ReportClientBugFormData = {
  title: string;
  description: string;
  additionalContext: string;
};

/**
 * A report another module prepared (rekuest: a failed task), to file against
 * the client that ran it. Lok resolves the client and its issue tracker; the
 * reporter never needs to know either.
 */
export type PreparedBugReport = {
  title: string;
  /** "the failed task: <b>Segment</b>" — what the report is about. */
  subject: string;
  context: string;
  contextLabel?: string;
  labels?: string[];
};

export type ReportClientBugDialogProps =
  | { client: DetailClientFragment; issueUrl?: string }
  | { clientId: string; report: PreparedBugReport };

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

export const ReportClientBugDialog = (props: ReportClientBugDialogProps) =>
  "clientId" in props ? (
    <PreparedReport clientId={props.clientId} report={props.report} />
  ) : (
    <ReportForm client={props.client} issueUrl={props.issueUrl} />
  );

/** A prepared report: look the client up by its OAuth id, then the same form. */
const PreparedReport = ({ clientId, report }: { clientId: string; report: PreparedBugReport }) => {
  const { closeDialog } = useDialog();
  const { data, loading } = useClientQuery({ variables: { clientId } });

  if (!data?.client) {
    return (
      <DialogHeader>
        <DialogTitle>Report Bug</DialogTitle>
        <div className="text-sm text-muted-foreground">
          {loading ? "Looking up the client…" : "Unable to find the client this ran on."}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => closeDialog()}>
            Close
          </Button>
        </DialogFooter>
      </DialogHeader>
    );
  }

  return <ReportForm client={data.client} issueUrl={data.client.issueUrl || undefined} report={report} />;
};

const ReportForm = ({
  client,
  issueUrl,
  report,
}: {
  client: DetailClientFragment;
  issueUrl?: string;
  report?: PreparedBugReport;
}) => {
  const { closeDialog } = useDialog();

  const form = useForm<ReportClientBugFormData>({
    defaultValues: {
      title: report?.title ?? `Bug in ${clientAppVersion(client)}`,
      description: "",
      additionalContext: report?.context ?? formatClientInfo(client),
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
        labels: report?.labels ?? ["bug", "client-reported"],
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
          <DialogTitle>{report ? "Report Bug" : "Report Client Bug"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            {report ? (
              <>
                Report a bug for {report.subject}, on{" "}
                <strong>{clientAppVersion(client)}</strong>
              </>
            ) : (
              <>
                Report a general bug for the client:{" "}
                <strong>{clientAppVersion(client)}</strong>
              </>
            )}
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
            label={report?.contextLabel ?? "Client Information"}
            description="Auto-generated information (you can edit this)"
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
