import { Link } from "react-router-dom";
import { createContext, Suspense, useContext } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  resolveProfileSections,
  type ProfileContext,
  type ProfileSection,
  type ProfileSectionRegistry,
} from "./section";

const SectionContext = createContext<ProfileSection | null>(null);

/**
 * Every applicable module section for one profile, stacked.
 *
 * Each is its module's guard around an error boundary around the section: a
 * module that is down, or whose query throws, drops out alone — the profile
 * and the other modules' sections stay.
 */
export const ProfileSections = ({
  ctx,
  registry,
}: {
  ctx: ProfileContext;
  registry: ProfileSectionRegistry;
}) => (
  <div className="flex flex-col gap-8">
    {resolveProfileSections(registry, ctx).map((section) => (
      <section.Guard key={section.id}>
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <SectionContext.Provider value={section}>
              <section.Component {...ctx} />
            </SectionContext.Provider>
          </Suspense>
        </ErrorBoundary>
      </section.Guard>
    ))}
  </div>
);

/**
 * The heading a section's content sits under — its title and icon come from
 * its descriptor, so a section names itself once. Render it only around rows
 * that exist; a section with nothing returns `null` instead.
 */
export const ProfileSectionFrame = ({
  children,
  more,
}: {
  children: React.ReactNode;
  /** Where "See all" goes — the module's own, unabridged list. */
  more?: string;
}) => {
  const section = useContext(SectionContext);
  const Icon = section?.icon;
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2 text-sm">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-medium">{section?.title}</h2>
        {more && (
          <Link
            to={more}
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            See all
          </Link>
        )}
      </header>
      {children}
    </section>
  );
};
