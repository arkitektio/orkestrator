import { PageLayout } from "@/core/components/layout/PageLayout";
import { Button } from "@/core/components/ui/button";
import { Link } from "react-router-dom";

const destinations = [
  {
    title: "Rekuest Dashboards",
    description: "Open the renderer-backed dashboards that now host materialized bloks.",
    to: "/rekuest/dashboards",
    cta: "Open Dashboards",
  },
  {
    title: "Bloks",
    description: "Browse blok definitions and materialize them from the current Rekuest pages.",
    to: "/rekuest/bloks",
    cta: "Open Bloks",
  },
  {
    title: "Materialized Bloks",
    description: "Inspect live materialized instances rendered through the shared blok renderer.",
    to: "/rekuest/materialized_bloks",
    cta: "Open Materialized Bloks",
  },
];

export const Home = () => {
  return (
    <PageLayout title="Blok">
      <div className="flex h-full w-full flex-col gap-6 p-4">
        <section className="rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Renderer Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Legacy module panels removed</h1>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            This area no longer bootstraps blok UI from the old module registry. Use the Rekuest pages below for dashboards, blok definitions, and materialized blok previews, all rendered through the shared blok renderer.
          </p>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {destinations.map((destination) => (
            <div
              key={destination.to}
              className="flex flex-col justify-between rounded-3xl border border-border/70 bg-muted/20 p-5 shadow-sm"
            >
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{destination.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{destination.description}</p>
              </div>

              <Button asChild className="mt-6 w-fit">
                <Link to={destination.to}>{destination.cta}</Link>
              </Button>
            </div>
          ))}
        </section>
      </div>
    </PageLayout>
  );
};
