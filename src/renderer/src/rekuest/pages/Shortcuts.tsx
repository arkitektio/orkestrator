import { RekuestShortcut } from "@/core/linkers";
import ShortcutList from "../components/lists/ShortcutList";

const Page = () => {
  return (
    <RekuestShortcut.ListPage title={"Shortcuts"}>
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Shorcuts
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            Panels are UI elements that can be composed to dashboards, just
            browse them here and drag them to your dashboard.
          </p>
        </div>
      </div>
      <ShortcutList />
    </RekuestShortcut.ListPage>
  );
};

export default Page;
