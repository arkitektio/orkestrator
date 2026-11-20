import { createList } from "@/core/layout/createList";
import { CARD_FRAME_MIN_WIDTH } from "@/core/ui/card-frame";
import { LokUser } from "@/core/linkers";
import { useUsersQuery } from "@/lok/api/graphql";
import UserCard from "../cards/UserCard";

const UserList = createList({
  useHook: useUsersQuery,
  dataKey: "users",
  ItemComponent: UserCard,
  title: "Users",
  smart: LokUser,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No user",
  emptyDescription: "Users appear once they sign in to your organization.",
  minItemWidth: CARD_FRAME_MIN_WIDTH,
  defaultLimit: 40,
});

export default UserList;
