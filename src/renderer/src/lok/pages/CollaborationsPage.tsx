import { PlusIcon } from "lucide-react";
import React, { useState } from "react";

import { useDialog } from "@/core/dialogs/registry";
import { ListRender } from "@/core/layout/ListRender";
import { LokCollaboration } from "@/core/linkers";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { Input } from "@/core/ui/input";
import { PageAction } from "@/core/ui/page-action";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { useCollaborationsQuery } from "../api/graphql";
import CollaborationCard from "../components/cards/CollaborationCard";
import { LOK_HELP } from "../help";

const PAGE = 20;

/**
 * The organization's collaborations (a guest: their own), a page at a time. Each is one key
 * across every service: what is in it lives on the services, its name and its links here.
 */
const CollaborationsPage: React.FC = () => {
  const { openDialog } = useDialog();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 250).trim();
  const { data, error, loading, refetch } = useCollaborationsQuery({
    variables: { filters: debounced ? { search: debounced } : undefined, pagination: { offset: 0, limit: PAGE } },
  });
  const collaborations = data?.collaborations;

  return (
    <LokCollaboration.ListPage
      help={LOK_HELP.collaborations}
      title="Collaborations"
      pageActions={
        <div className="flex items-center gap-2">
          <Input
            className="h-8 w-48"
            placeholder="Search…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search collaborations"
          />
          <PageAction
            alwaysShow
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => openDialog("createcollaboration", {}, { size: "medium" })}
          >
            New
          </PageAction>
        </div>
      }
    >
      <div className="p-3">
        <ListRender array={collaborations} error={error} refetch={refetch} limit={PAGE} minItemWidth={CARD_FRAME_MIN_WIDTH}>
          {(item) => <CollaborationCard key={item.id} item={item} />}
        </ListRender>
        {!loading && collaborations?.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {debounced
              ? "No collaboration has that name."
              : "No collaborations yet. Make one, then put objects or a whole workflow in it and share it by link."}
          </p>
        )}
      </div>
    </LokCollaboration.ListPage>
  );
};

export default CollaborationsPage;
