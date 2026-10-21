import { RekuestMaterializedBlok } from "@/core/linkers";
import MaterializedBlokList from "../components/lists/MaterializedBlokList";
import { REKUEST_HELP } from "../help";

/** The materializations people made, of their custom bloks. */
const Page = () => {
  return (
    <RekuestMaterializedBlok.ListPage
      help={REKUEST_HELP.materializedBloks}
      title={"Custom Materialized Bloks"}
    >
      <div className="p-6">
        <div className="col-span-4 mb-3 grid gap-4 md:grid-cols-2 md:items-center md:gap-8 xl:gap-20">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Custom Materialized Bloks
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Materialized bloks are deployed instances of a blok bound into a dashboard
              with concrete agent mappings. These are the ones people made from custom
              bloks.
            </p>
          </div>
        </div>

        <MaterializedBlokList filters={{ provided: false }} />
      </div>
    </RekuestMaterializedBlok.ListPage>
  );
};

export default Page;
