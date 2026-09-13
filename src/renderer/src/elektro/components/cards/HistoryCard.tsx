import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RekuestTask } from "@/linkers";
import { AppInfo } from "@/lok-next/components/protected/AppInfo";
import { UserInfo } from "@/lok-next/components/protected/UserInfo";
import Timestamp from "@/components/ui/timestamp";
import { HistoryKind, ProvenanceEntryFragment } from "../../api/graphql";

interface HistoryCardProps {
  history: ProvenanceEntryFragment;
}

const HistoryCard = ({ history }: HistoryCardProps) => {
  return (
    <Card key={history.id}>
      <CardHeader className="flex flex-row gap-1">
        <div className="my-auto">
          <UserInfo sub={history.user?.sub} />
        </div>
        <div>
          <CardTitle>
            {history.kind == HistoryKind.Create && "created it"}{" "}
            {history.kind == HistoryKind.Update && "updated"}{" "}
            {history.kind == HistoryKind.Delete && "deleted it"}
          </CardTitle>
          <CardDescription>
            <Timestamp date={history.date} relative className="text-xs" />
            <div className="text-muted-xs w-auto text-sm">
              {history.client && (
                <>
                  utilizing <AppInfo clientId={history.client?.clientId} />
                </>
              )}
            </div>
            {history.task && (
              <div className="flex flex-row items-center gap-1">
                <RekuestTask.DetailLink
                  className={({ isActive }) =>
                    "z-10 font-bold text-md cursor-pointer " +
                    (isActive ? "text-primary-300" : "")
                  }
                  object={{id:  history.task.taskId}}
                >
                  <Badge> during</Badge>
                </RekuestTask.DetailLink>
                {history.task.assigner && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      assigned by
                    </span>
                    <UserInfo sub={history.task.assigner.sub} />
                  </>
                )}
              </div>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row flex-wrap gap-1">
          {history.effectiveChanges.map((change, idx) => (
            <Badge variant="outline" key={idx}>
              {change.field}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(HistoryCard);