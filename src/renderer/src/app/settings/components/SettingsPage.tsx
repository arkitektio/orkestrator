import { PageLayout } from "@/core/layout/PageLayout";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SETTINGS_HELP } from "../help";
import { sectionBySlug } from "../sections";

/**
 * One section's page: the layout's title row, then a reading-width column
 * with the section's one-line description on top. Sections are cards inside;
 * the page itself is not one.
 */
export const SettingsPage = ({
  slug,
  pageActions,
  title,
  description,
  back,
  children,
}: {
  slug: string;
  pageActions?: React.ReactNode;
  /** A page below a section (one service of the hub): its own title and line. */
  title?: string;
  description?: React.ReactNode;
  /** Where "back" goes, for a page below a section. */
  back?: { to: string; label: string };
  children: React.ReactNode;
}) => {
  const section = sectionBySlug(slug);
  const heading = title ?? section?.label;
  const line = description ?? section?.description;
  return (
    <PageLayout title={heading ?? "Settings"} pageActions={pageActions} help={SETTINGS_HELP[slug]}>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-3">
        {back && (
          <Link
            to={back.to}
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            {back.label}
          </Link>
        )}
        {heading && (
          <div>
            <h1 className="text-xl font-semibold">{heading}</h1>
            {line && <p className="text-sm text-muted-foreground">{line}</p>}
          </div>
        )}
        {children}
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
