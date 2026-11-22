import { RekuestGuard } from "@/rekuest/api/hooks";
import { ProfileSectionFrame } from "@/core/connection/profile/ProfileSections";
import { ProfileRows } from "@/core/connection/profile/rows";
import type { ProfileContext, ProfileSection } from "@/core/connection/profile/section";
import { Zap } from "lucide-react";
import { useMyAllowancesQuery } from "../api/graphql";
import { AllowanceRow } from "../components/action/ActionAllowances";

/**
 * Their auto list: the actions an agent gets under their runs without a hold.
 * Only on one's own profile: the server lists the caller's rules, nobody else's.
 */
const AutoList = (_: ProfileContext) => {
  const { data } = useMyAllowancesQuery({ fetchPolicy: "cache-and-network" });
  const allowances = data?.myAllowances ?? [];
  if (allowances.length === 0) return null;
  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {allowances.map((allowance) => (
          <AllowanceRow key={allowance.id} allowance={allowance} />
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

export const REKUEST_PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "rekuest.autolist",
    module: "rekuest",
    title: "Runs without asking",
    icon: Zap,
    priority: 40,
    Guard: RekuestGuard,
    applies: (ctx) => ctx.isMe,
    Component: AutoList,
  },
];
