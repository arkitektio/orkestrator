import { Menu, Transition } from "@headlessui/react";
import React, { Fragment } from "react";
import { useNavigate } from "react-router";
import { useHerre } from "herre";

export type IAdminPanelProps = {};

const AdminPanel: React.FC<IAdminPanelProps> = ({}) => {
  const { user } = useHerre();
  const navigate = useNavigate();

  if (!user?.roles?.includes("admin")) return <> </>;

  return (
    <>
      <Menu as="div" className="ml-3 relative">
        {({ open }) => (
          <>
            <div>
              <Menu.Button className="rounded-full focus:ring-offset-gray-800 focus:ring-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </Menu.Button>
            </div>
            <Transition
              show={open}
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items
                static
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-40"
              >
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={() => navigate("/apps")}
                      className={
                        "p-2 text-sm text-gray-800 hover:bg-gray-700 hover:text-gray-200 "
                      }
                    >
                      Manage Apps
                    </div>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={() => navigate("/models")}
                      className={
                        "p-2 text-sm text-gray-800 hover:bg-gray-700 hover:text-gray-200 "
                      }
                    >
                      Manage Models
                    </div>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={() => navigate("/debug")}
                      className={
                        "p-2 text-sm text-gray-800 hover:bg-gray-700 hover:text-gray-200 "
                      }
                    >
                      Debugging
                    </div>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={() => navigate("/debug")}
                      className={
                        "p-2 text-sm text-gray-800 hover:bg-gray-700 hover:text-gray-200 "
                      }
                    >
                      Repositories
                    </div>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </>
        )}
      </Menu>
    </>
  );
};

export { AdminPanel };
