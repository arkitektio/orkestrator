import React from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { notEmpty } from "../floating/utils";
import {
  RunsDocument,
  RunsQuery,
  useDeleteRunMutation,
  useRunsQuery,
} from "../fluss/api/graphql";
import { RunCard } from "../fluss/components/cards/RunCard";
import { withFluss } from "../fluss/fluss";
import { SectionTitle } from "../layout/SectionTitle";
import { Run } from "../linker";
import { useDeleteRunMate } from "../mates/run/useDeleteRunMate";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMyGraphsProps = {};

const MyRuns: React.FC<IMyGraphsProps> = ({}) => {
  const { data } = withFluss(useRunsQuery)();

  const deleteRunMate = useDeleteRunMate();

  const { confirm } = useConfirm();

  return (
    <div>
      <Run.ListLink>
        <SectionTitle>Latest Runs</SectionTitle>
      </Run.ListLink>
      <br />
      <ResponsiveGrid>
        {data?.runs?.filter(notEmpty).map((s, index) => (
          <RunCard run={s} key={index} mates={[deleteRunMate(s)]} />
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyRuns };
