import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/core/ui/empty";
import { Input } from "@/core/ui/input";
import { Search } from "lucide-react";
import { PageAction } from "@/core/ui/page-action";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MailSplit } from "../components/split/MailSplit";
import { MailList } from "../components/list/MailList";
import { KUVERT_HELP } from "../help";
import { MailMessage } from "../linkers";

/**
 * Mail search over every visible mailbox. Words match subject, sender and
 * text, and by meaning ("flight booking" finds the airline's mail); exact
 * matches rank first. `?similar=<id>` lists the mail nearest to one message.
 */
const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const similar = params.get("similar");
  const [text, setText] = useState(params.get("q") ?? "");
  const search = useDebounce(text.trim(), 300);

  useEffect(() => {
    if (similar) return;
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (search) out.set("q", search);
        else out.delete("q");
        return out;
      },
      { replace: true },
    );
  }, [search]);

  const filters = similar ? { similarTo: similar } : search ? { search } : undefined;

  return (
    <MailMessage.ListPage
      title={similar ? "Similar mail" : "Search mail"}
      help={KUVERT_HELP.search}
      pageActions={
        <PageAction.Slot alwaysShow>
          <Input
            autoFocus
            placeholder="Search mail…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (similar) {
                setParams(
                  (current) => {
                    const out = new URLSearchParams(current);
                    out.delete("similar");
                    return out;
                  },
                  { replace: true },
                );
              }
            }}
            className="h-8 w-64 text-sm"
          />
        </PageAction.Slot>
      }
    >
      <MailSplit
        list={
          filters ? (
            <MailList
              key={JSON.stringify(filters)}
              title={similar ? "Similar mail" : `“${search}”`}
              subtitle={similar ? "Nearest first" : "Exact matches first, then by meaning"}
              source={{ kind: "messages", filters, ordering: [] }}
              empty={{ title: "Nothing found", description: "Try other words, or fewer." }}
            />
          ) : (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>Search every mailbox</EmptyTitle>
                <EmptyDescription>Words match subject, sender and text, and also by meaning.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        }
      />
    </MailMessage.ListPage>
  );
};

export default SearchPage;
