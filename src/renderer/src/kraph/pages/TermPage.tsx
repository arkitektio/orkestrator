import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { KraphTerm } from "@/linkers";
import { useGetTermQuery } from "../api/graphql";
import UpdateTermForm from "../forms/UpdateTermForm";
import { termKindLabel, termTint } from "../lib/terms";
import { WithKraphMediaUrl } from "@/lib/datalayer/kraphAccess";

const Page = asDetailQueryRoute(useGetTermQuery, ({ data, refetch }) => {
  const term = data.term;

  return (
    <KraphTerm.ModelPage
      object={{ id: term.id }}
      title={term.key}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <KraphTerm.Knowledge object={{ id: term.id }} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={
        <div className="flex flex-row gap-2">
          <KraphTerm.ObjectButton object={{ id: term.id }} />
          <FormSheet
            trigger={<Button variant="outline">Edit</Button>}
            onSubmit={() => refetch()}
          >
            <UpdateTermForm term={term} />
          </FormSheet>
        </div>
      }
    >
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <div
            className="h-1 w-16 mb-4 rounded"
            style={{ background: termTint(term.color) }}
          />
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {term.label || term.key}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {term.key} · {termKindLabel(term.kind)}
          </p>
          <p className="mt-3 text-xl text-muted-foreground">
            {term.description}
          </p>
          {term.purl && (
            <a
              href={term.purl}
              className="mt-3 inline-block text-sm text-muted-foreground underline"
            >
              {term.purl}
            </a>
          )}
        </div>
        <div className="w-full h-full flex-row relative">
          {term.image && (
            <WithKraphMediaUrl media={term.image}>
              {(url) => (
                <Image
                  src={url}
                  style={{ filter: "brightness(0.7)" }}
                  className="object-cover h-full w-full absolute top-0 left-0 rounded rounded-lg"
                />
              )}
            </WithKraphMediaUrl>
          )}
        </div>
      </div>

      {/* A category is what the word means *here*. Claims name the term, not
          the category row, so every graph below sees the same claims. */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-semibold mb-1">Declared by</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Each graph below declares this word. They all see the same claims.
        </p>
        {term.categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No graph declares this word yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {term.categories.map((category) => (
              <Card key={category.id} className="p-3 relative overflow-hidden">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: termTint(category.color) }}
                />
                <div className="font-semibold text-sm">{category.label}</div>
                <div className="text-xs text-muted-foreground">
                  {category.graph.name}
                </div>
                {category.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                    {category.description}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </KraphTerm.ModelPage>
  );
});

export default Page;
