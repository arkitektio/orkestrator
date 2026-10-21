import { RekuestMaterializedBlok } from "@/core/linkers";
import MaterializedBlokList from "../components/lists/MaterializedBlokList";
import { REKUEST_HELP } from "../help";

/** Agents' own materializations of the bloks their app provides. */
const Page = () => {
  return (
    <RekuestMaterializedBlok.ListPage
      help={REKUEST_HELP.providedMaterializedBloks}
      title={"App-provided Materialized Bloks"}
    >
      <div className="p-6">
        <div className="col-span-4 mb-3 grid gap-4 md:grid-cols-2 md:items-center md:gap-8 xl:gap-20">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              App-provided Materialized Bloks
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Each agent keeps its own materialization of the bloks its app provides,
              in step with its registrations. Rematerialize one to make a copy of your
              own.
            </p>
          </div>
        </div>

        <MaterializedBlokList filters={{ provided: true }} />
      </div>
    </RekuestMaterializedBlok.ListPage>
  );
};

export default Page;
