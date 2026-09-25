import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { StringField } from "@/core/components/fields/StringField";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Form } from "@/core/components/ui/form";
import { StructureDisplay } from "@/core/components/display/StructureDisplay";
import { AlpakaCollection, AlpakaLLMModel } from "@/core/linkers";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  ChromaCollectionFragment,
  useGetChromaCollectionQuery,
  useQueryDocumentsLazyQuery,
} from "../api/graphql";

export type IRepresentationScreenProps = {};

export const CollectionSummary = (props: {
  collection: ChromaCollectionFragment;
}) => {
  const { description, count, embedder } = props.collection;

  return (
    <div className="mb-4 space-y-2">
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {/* `count` is null when the vector database cannot be reached. */}
          {count == null
            ? "Document count unavailable"
            : `${count} ${count === 1 ? "document" : "documents"}`}
        </span>
        <span className="inline-flex items-center gap-1">
          Embedded with
          <AlpakaLLMModel.DetailLink
            object={embedder}
            className="text-foreground hover:underline"
          >
            {embedder.label}
          </AlpakaLLMModel.DetailLink>
        </span>
      </div>
    </div>
  );
};

export const DocumentsExplorer = (props: {
  collection: ChromaCollectionFragment;
}) => {
  const [search, data] = useQueryDocumentsLazyQuery();

  const form = useForm({
    defaultValues: {
      query: "",
    },
  });

  const { watch } = form;

  const query = watch("query");

  const handleSearch = async () => {
    await search({
      variables: {
        input: {
          collection: props.collection.id,
          queryTexts: [query],
        },
      },
    });
  };

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery) {
      handleSearch();
    }
  }, [debouncedQuery]);

  return (
    <>
      <Form {...form}>
        <form>
          <StringField
            placeholder="Search"
            name="query"
            label="Search"
          />
        </form>

        <div className="flex flex-col gap-2">
          {data?.data?.documents?.map((doc) => (
            <div key={doc.id} className="border border-border p-2 rounded">
              {doc.structure ? (
                <StructureDisplay identifier={doc.structure.identifier} id={String(doc.structure.object)} small />
              ) : (
                <>{doc.content}</>
              )}
            </div>
          ))}
        </div>
      </Form>
    </>
  );
};

const TPage = asDetailQueryRoute(
  useGetChromaCollectionQuery,
  ({ data }) => {
    return (
      <AlpakaCollection.ModelPage
        title={data?.chromaCollection?.name}
        object={data.chromaCollection}
        pageActions={
          <>
            <AlpakaCollection.ObjectButton alwaysShow object={data.chromaCollection} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <AlpakaCollection.Knowledge object={data.chromaCollection} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <CollectionSummary collection={data.chromaCollection} />
        <DocumentsExplorer collection={data.chromaCollection} />
      </AlpakaCollection.ModelPage>
    );
  },
);


export default TPage;
