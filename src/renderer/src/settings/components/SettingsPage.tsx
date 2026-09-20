import { PageLayout } from "@/components/layout/PageLayout";
import { sectionBySlug } from "../sections";

/**
 * One section's page: the layout's title row, then a reading-width column
 * with the section's one-line description on top. Sections are cards inside;
 * the page itself is not one.
 */
export const SettingsPage = ({
  slug,
  pageActions,
  children,
}: {
  slug: string;
  pageActions?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const section = sectionBySlug(slug);
  return (
    <PageLayout title={section?.label ?? "Settings"} pageActions={pageActions}>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-3">
        {section && (
          <div>
            <h1 className="text-xl font-semibold">{section.label}</h1>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
        )}
        {children}
      </div>
    </PageLayout>
  );
};

export default SettingsPage;
