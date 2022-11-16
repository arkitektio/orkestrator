import { Popover } from "@headlessui/react";
import React, { useState } from "react";
import { usePopper } from "react-popper";
import {
  NotificationCenterItem,
  useNotificationCenter,
} from "react-toastify/addons/use-notification-center";
import { useAgent } from "../../rekuest/agent/AgentContext";
import { useHerre } from "herre";
import { useProfileQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/context";
import { useMikro } from "../../mikro/MikroContext";

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
      <div className="flex flex-col bg-slate-600 p-1 rounded">
        {props.notifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-slate-50 gap-2 border-gray-800 p-1 border mb-1 rounded rounded-md font-thin"
          >
            {notification?.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export const UserIcon: React.FC<Props> = (props: Props) => {
  const { user, logout } = useHerre();
  const { provide, setProvide } = useAgent();

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
              className="bg-back-400 dark:bg-slate-50 p-2 rounded rounded-md border-gray-400"
              style={styles.popper}
              {...attributes.popper}
            >
              <NotificationCenter notifications={notifications} />
              <div className="flex flex-row mt-2">
                <div className="flex-grow"></div>
                <div
                  onClick={() => setProvide(!provide)}
                  className={
                    "px-2 text-sm text-gray-800 hover:bg-gray-700 hover:text-gray-200 cursor-pointer"
                  }
                >
                  {provide ? "...Providing" : "Provide"}
                </div>
                <div
                  onClick={() => logout()}
                  className={
                    "text-center px-2 text-sm  hover:bg-gray-700 hover:text-gray-200 cursor-pointer border border-red-400 rounded-md text-red-500"
                  }
                >
                  Log Out
                </div>
              </div>
            </Popover.Panel>
          </>
        )}
      </Popover>
    </>
  );
};
