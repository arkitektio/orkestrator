import { ScrollArea } from "../ui/scroll-area";

export type AppLayoutProps = {
  children: React.ReactNode;
  searchBar: React.ReactNode;
  bottomBar?: React.ReactNode;
};

export const SidebarLayout = ({ children, searchBar, bottomBar }: AppLayoutProps) => {
  return (
    <div className="flex h-full flex-col justify-between" data-enableselect={true}>
      <div className="flex-initial h-16 flex px-2 py-2 ">
        {searchBar}
      </div>

      <ScrollArea
        className="flex-grow flex flex-col gap-2 p-3 direct @container"
        data-enableselect={true}
      >
        {children}
      </ScrollArea>
      {bottomBar && <div className="flex-initial">
        {bottomBar}
      </div>}
    </div>
  );
};
