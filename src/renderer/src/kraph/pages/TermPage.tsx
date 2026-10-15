import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { FormSheet } from "@/core/dialogs/FormDialog";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Image } from "@/core/ui/image";
import { SwatchColorPicker } from "@/core/ui/SwatchColorPicker";
import { toast } from "@/core/notify";
import {
  KraphEntityCategory,
  KraphGraph,
  KraphMeasurementCategory,
  KraphNaturalEventCategory,
  KraphProtocolEventCategory,
  KraphRelationCategory,
  KraphStructureRelationCategory,
  KraphTerm,
} from "@/core/linkers";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import {
  DetailTermFragment,
  TermCategoryFragment,
  useGetTermQuery,
  useSetTermHiddenMutation,
  useTermNamesakesQuery,
  useUpdateTermMutation,
} from "../api/graphql";
import UpdateTermForm from "../forms/UpdateTermForm";
import { TermBadge } from "../components/TermBadge";
import { termKindLabel, termTint } from "../lib/terms";
import { WithKraphMediaUrl } from "@/kraph/datalayer/kraphAccess";
import { KRAPH_HELP } from "../help";

/** Each kind of category has its own page; the term links to the one it is. */
const CATEGORY_LINKS: Record<NonNullable<TermCategoryFragment["__typename"]>, typeof KraphEntityCategory> = {
  EntityCategory: KraphEntityCategory,
  MeasurementCategory: KraphMeasurementCategory,
  NaturalEventCategory: KraphNaturalEventCategory,
  ProtocolEventCategory: KraphProtocolEventCategory,
  RelationCategory: KraphRelationCategory,
  StructureRelationCategory: KraphStructureRelationCategory,
};

const useSetHidden = (term: { id: string; key: string }) => {
  const [mutate, { loading }] = useSetTermHiddenMutation({ refetchQueries: ["ListTerms"] });
  const set = (hidden: boolean) =>
    mutate({ variables: { id: term.id, hidden } })
      .then(() => toast.success(hidden ? `Hid “${term.key}”` : `“${term.key}” is offered again`))
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
  return { set, loading };
};

/** Each graph's rule for this word. They all read the same claims. */
const DeclaredBy = ({ term }: { term: DetailTermFragment }) => (
  <section>
    <h2 className="text-lg font-semibold">Declared by</h2>
    <p className="mb-3 text-sm text-muted-foreground">
      Every graph below speaks this word, under a category of its own. They all see the same claims.
    </p>
    {term.categories.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        No graph declares this word yet. Claims under it are kept, and appear in a graph once it declares
        the word.
      </p>
    ) : (
      <ul className="divide-y divide-border rounded-md border border-border">
        {term.categories.map((category) => {
          const Linker = category.__typename ? CATEGORY_LINKS[category.__typename] : undefined;
          return (
            <li key={category.id} className="flex items-start gap-3 px-3 py-2">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: termTint(category.color) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  {Linker ? (
                    <Linker.DetailLink object={{ id: category.id }} className="font-medium hover:underline">
                      {category.label}
                    </Linker.DetailLink>
                  ) : (
                    <span className="font-medium">{category.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground">in</span>
                  <KraphGraph.DetailLink
                    object={{ id: category.graph.id }}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {category.graph.name}
                  </KraphGraph.DetailLink>
                </div>
                {category.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{category.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

/** The same word as other kinds of thing: two terms, linked for the reader. */
const Namesakes = ({ term }: { term: DetailTermFragment }) => {
  const { data } = useTermNamesakesQuery({ variables: { key: term.key } });
  const others = data?.terms.filter((other) => other.id !== term.id) ?? [];
  if (others.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold">Same word, other kinds</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        “{term.key}” also names other sorts of thing. Each is a term of its own, with its own claims.
      </p>
      <div className="flex flex-wrap gap-2">
        {others.map((other) => (
          <span key={other.id} className="inline-flex items-center gap-1.5">
            <TermBadge term={other} />
            <span className="text-xs text-muted-foreground">{termKindLabel(other.kind)}</span>
          </span>
        ))}
      </div>
    </section>
  );
};

const Page = asDetailQueryRoute(useGetTermQuery, ({ data, refetch }) => {
  const term = data.term;
  const { set: setHidden, loading: hiding } = useSetHidden(term);
  const [update] = useUpdateTermMutation();

  return (
    <KraphTerm.ModelPage
      help={KRAPH_HELP.term}
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
        <>
          <KraphTerm.ObjectButton alwaysShow object={{ id: term.id }} />
          <PageAction
            collapse="icon"
            icon={term.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            disabled={hiding}
            onClick={() => setHidden(!term.hidden)}
          >
            {term.hidden ? "Show" : "Hide"}
          </PageAction>
          <FormSheet trigger={<PageAction>Edit</PageAction>} onSubmit={() => refetch()}>
            <UpdateTermForm term={term} />
          </FormSheet>
        </>
      }
    >
      <div className="flex flex-col gap-8 p-6">
        {term.hidden && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
            <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              This word is hidden. Pickers no longer offer it; the claims under it still stand, and graphs
              that declare it still draw them.
            </span>
            <Button size="sm" variant="outline" disabled={hiding} onClick={() => setHidden(false)}>
              Show again
            </Button>
          </div>
        )}

        <header className="flex flex-col gap-6 md:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {/* The colour every graph's default for this word starts from. */}
              <SwatchColorPicker
                value={term.color ?? null}
                title="Colour of this word"
                align="start"
                onCommit={(color) =>
                  update({ variables: { input: { id: term.id, color: [...color] } } }).catch((e) =>
                    toast.error(e instanceof Error ? e.message : String(e)),
                  )
                }
              />
              <h1 className="scroll-m-20 truncate text-4xl font-extrabold tracking-tight">{term.key}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{termKindLabel(term.kind)}</Badge>
              {term.label && term.label !== term.key && <span className="text-foreground">{term.label}</span>}
              {term.hidden && <Badge variant="outline">Hidden</Badge>}
              <span>since {new Date(term.createdAt).toLocaleDateString()}</span>
            </div>
            {term.description ? (
              <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{term.description}</p>
            ) : (
              <p className="mt-4 text-sm italic text-muted-foreground">
                No description yet. Press Edit to say what this word means.
              </p>
            )}
            {term.purl && (
              <a
                href={term.purl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground underline hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {term.purl}
              </a>
            )}
          </div>
          {term.image && (
            <div className="relative h-40 w-full overflow-hidden rounded-lg md:w-72">
              <WithKraphMediaUrl media={term.image}>
                {(url) => <Image src={url} className="absolute inset-0 h-full w-full object-cover" />}
              </WithKraphMediaUrl>
            </div>
          )}
        </header>

        <DeclaredBy term={term} />
        <Namesakes term={term} />
      </div>
    </KraphTerm.ModelPage>
  );
});

export default Page;
