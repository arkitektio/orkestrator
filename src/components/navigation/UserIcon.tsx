import { Popover } from "@headlessui/react";
import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import React, { useState } from "react";
import { TbCloudDataConnection } from "react-icons/tb";
import { usePopper } from "react-popper";
import {
  NotificationCenterItem,
  useNotificationCenter,
} from "react-toastify/addons/use-notification-center";
import { useProfileQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/context";
import { useMikro } from "../../mikro/MikroContext";
import { useAgent } from "../../rekuest/agent/AgentContext";
import { useAlert } from "../alerter/alerter-context";

interface Props {}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export const NotificationCenter = (props: {
  notifications: NotificationCenterItem<any>[];
}) => {
  const [showUnreadOnly, toggleFilter] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="font-light mb-1">Notifications</div>
      <div className="flex flex-col bg-slate-600 p-1 rounded text-black">
        {props.notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-slate-50 gap-2 border-gray-800 p-1 border mb-1 rounded rounded-md font-thin"
          ></div>
        ))}
      </div>
    </div>
  );
};

export const UserIcon: React.FC<Props> = (props: Props) => {
  const { user, logout } = useHerre();
  const { provide, startProvide, cancelProvide } = useAgent();
  const { fakts } = useFakts();

  const {
    notifications,
    clear,
    markAllAsRead,
    markAsRead,
    remove,
    unreadCount,
  } = useNotificationCenter();

  const { data } = withMan(useProfileQuery)();
  const [referenceElement, setReferenceElement] =
    useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  );
  const [arrowElement, setArrowElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "right-end",
  });

  const { s3resolve } = useMikro();
  const { alert } = useAlert();

  return (
    <>
      {/* Profile dropdown */}
      <Popover>
        {({ open }) => (
          <>
            <Popover.Button
              as={"div"}
              className="dark:text-gray-800 flex text-sm rounded-md px-2 py-2  mr-1 relative"
              ref={(ref: any) => setReferenceElement(ref)}
            >
              <span className="sr-only">Open user menu</span>
              <img
                className="h-10 w-10 rounded-md hover:ring-2 hover:ring-primary-300 cursor-pointer bg-primary-200"
                src={
                  data?.me?.profile?.avatar
                    ? s3resolve(data?.me?.profile?.avatar)
                    : `https://eu.ui-avatars.com/api/?name=${data?.me?.username}`
                }
                alt=""
              />
              {unreadCount > 0 && (
                <div className="absolute -translate-x-1 right-0 top-0 text-white px-1 bg-primary-500 rounded-md">
                  {unreadCount}
                </div>
              )}
            </Popover.Button>
            <Popover.Panel
              /// <reference path="" />
              as="div"
              ref={(ref: any) => setPopperElement(ref)}
              id="tooltip"
              role="tooltip"
              className="bg-back-400 dark:bg-back-800 p-2 rounded rounded-md  mb-2 border-back-700 shadow shadow-lg shadow-slate-800 border"
              style={styles.popper}
              {...attributes.popper}
            >
              <div className="flex flex-col">
                <div className="flex flex-row cursor-pointer">
                  <div className="flex-grow flex-col "></div>
                  <TbCloudDataConnection className="my-auto mr-1" />
                  {fakts?.self?.name}
                </div>
              </div>
              <div className="flex flex-row mt-2">
                <div className="flex-grow"></div>
                <div className="flex flex-row gap-2">
                  <div className="flex grow"></div>
                  {!provide ? (
                    <div
                      onClick={() =>
                        startProvide().catch((e) =>
                          alert({
                            message: e.message,
                            subtitle: "Provision Error",
                          })
                        )
                      }
                      className={
                        "px-2 text-sm text-slate-50 hover:bg-gray-700 hover:text-gray-200 cursor-pointer border border-primary rounded-400 p-2 rounded-md"
                      }
                    >
                      {provide ? "...Providing" : "Provide"}
                    </div>
                  ) : (
                    <div
                      onClick={() =>
                        cancelProvide().catch((e) => alert(e.message))
                      }
                      className={
                        "px-2 text-sm text-slate-50 hover:bg-gray-700 hover:text-gray-200 cursor-pointer border border-primary rounded-400 p-2 animate-pulse rounded-md"
                      }
                    >
                      {provide ? "Providing" : "Provide"}
                    </div>
                  )}
                  <div
                    onClick={() => logout()}
                    className={
                      "text-center px-2 text-sm  hover:bg-gray-700 hover:text-gray-200 cursor-pointer border border-red-400  text-red-500 p-2 rounded-md"
                    }
                  >
                    Log Out
                  </div>
                </div>
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
    </>
  );
};
