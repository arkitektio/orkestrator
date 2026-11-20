import React from "react";
import { AppWindow, Cpu, Fingerprint, Group } from "lucide-react";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { LokDevice } from "@/core/linkers";
import { BrowseDeviceFragment } from "../../api/graphql";
import { deviceLabel } from "../UserAvatar";

interface Props {
  item: BrowseDeviceFragment;
}

/**
 * A device in the shared card frame: its name ("Unnamed" when it has none),
 * the groups it is in and how many apps run on it, and at the foot the id it
 * registered with.
 */
const TheCard = ({ item }: Props) => {
  const groups = item.deviceGroups.map((group) => group.name).join(", ");
  const facts: CardFact[] = [
    ...(groups ? [{ icon: Group, content: groups, title: "Groups" }] : []),
    {
      icon: AppWindow,
      content: `${item.clients.length} ${item.clients.length === 1 ? "app" : "apps"}`,
      title: "Apps registered on it",
    },
    { icon: Fingerprint, content: <span className="font-mono">{item.deviceId}</span>, title: item.deviceId, at: "end" },
  ];

  return (
    <LokDevice.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="brand"
        icon={Cpu}
        watermark={<Cpu strokeWidth={1.25} />}
        title={
          <LokDevice.DetailLink
            object={item}
            className={item.name?.trim() ? "min-w-0 truncate hover:underline" : "min-w-0 truncate italic hover:underline"}
          >
            {deviceLabel(item)}
          </LokDevice.DetailLink>
        }
        facts={facts}
        stacked
        menu
      />
    </LokDevice.Smart>
  );
};

export default React.memo(TheCard);
