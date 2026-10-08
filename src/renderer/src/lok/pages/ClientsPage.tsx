import { LokClient } from "@/core/linkers";
import ClientList from "../components/lists/ClientList";

const Page = () => {
  return (
    <LokClient.ListPage title="Clients">
      <div className="p-3">
        <ClientList defaultLimit={30} />
      </div>
    </LokClient.ListPage>
  );
};

export default Page;
