import { Combobox, Dialog, Transition } from "@headlessui/react";
import React, { useEffect, useState } from "react";
import { BiSearch } from "react-icons/bi";
import { BaseAction, useGeneralMenu } from "./GeneralMenuContext";

const modifyingActions: BaseAction[] = [
  {
    extension: "modify",
    label: "Data",
    key: "search",
    description: "Search for Data",
  },
];

export const queryfiltered = (
  actions: BaseAction[] | undefined,
  query: string
) => {
  return (
    actions?.filter((action) => {
      return action.label.toLowerCase().includes(query.toLowerCase());
    }) || []
  );
};

export const GeneralMenu = () => {
  const [open, setOpen] = React.useState(false);

  const { extensions, modifiers, actions, setModifiers } = useGeneralMenu();

  const [orderedActions, setOrderedActions] = React.useState<{
    [key: string]: BaseAction[];
  }>({});

  const [selectedAction, setSelectedAction] = useState<BaseAction>();
  const [query, setQuery] = useState("");

  const onAction = (action: BaseAction | undefined | null) => {
    if (action) {
      if (action.extension === "modify") {
        setModifiers((modifiers) => [
          ...new Set([
            ...modifiers,
            { key: action.key, label: action.label, params: action.params },
          ]),
        ]);
        setQuery("");
        return;
      }
      if (action.custom) {
        action.custom(action).then((result) => {
          if (result) {
            setOpen(result.open == undefined ? false : result.open);
            setModifiers(result.modifiers || []);
            setQuery(result.query || "");
          } else {
            setOpen(false);
            setModifiers([]);
            setQuery("");
          }
        });
      } else {
        let extension = extensions.filter((h) => h.key === action.extension)[0];

        extension.do(action).then((result) => {
          if (result) {
            setOpen(result.open == undefined ? false : result.open);
            setModifiers(result.modifiers || []);
            setQuery(result.query || "");
          } else {
            setOpen(false);
            setModifiers([]);
            setQuery("");
          }
        });
      }
    }
  };

  useEffect(() => {
    if (selectedAction) {
      onAction(selectedAction);
    }
  }, [selectedAction]);

  useEffect(() => {
    if (query || query.length > 0) {
      let x = extensions.map((handler) =>
        handler
          .filter({ query: query, modifiers: modifiers, open: open })
          .then((actions) => ({ [handler.key]: actions }))
      );

      Promise.all(x)
        .then((results) => {
          console.log(results);
          return results.reduce((prev, curr) => ({ ...prev, ...curr }), {
            modify: modifyingActions.filter((a) =>
              a.label.toLowerCase().includes(query.toLowerCase())
            ),
            actions: actions.filter((a) =>
              a.label.toLowerCase().includes(query.toLowerCase())
            ),
          });
        })
        .then(setOrderedActions)
        .catch((e) => console.error(e));
    } else {
      setOrderedActions({
        actions: actions,
      });
    }
  }, [query, modifiers, extensions, actions]);

  // Toggle the menu when ⌘K is pressed
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "m" && e.ctrlKey) {
        setOpen((open) => !open);
      }
      if (e.key === "k" && e.ctrlKey && !e.shiftKey) {
        setOpen((open) => !open);
      }
      if (e.key === "," && e.ctrlKey) {
        if (modifiers.length > 0) {
          setModifiers((modifiers) => modifiers.slice(0, -1));
        } else {
          setOpen((open) => !open);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [modifiers]);

  return (
    <Transition
      show={open}
      enter="transition duration-100 ease-out"
      enterFrom="transform scale-95 opacity-0"
      enterTo="transform scale-100 opacity-100"
      leave="transition duration-75 ease-out"
      leaveFrom="transform scale-100 opacity-100"
      leaveTo="transform scale-95 opacity-0"
      as={React.Fragment}
    >
      <Dialog
        as="div"
        static
        className="fixed z-10 inset-0 overflow-y-auto"
        onClose={() => setOpen(false)}
      >
        <Dialog.Overlay className="fixed inset-0 bg-gray-800 bg-opacity-75 transition-opacity" />
        <Combobox
          value={selectedAction}
          nullable
          onChange={(v) => onAction(v)}
          as="div"
          className="relative sm:mx-auto sm:mt-[20vh] mt-4 mx-4 max-w-xl bg-white dark:bg-slate-50 rounded-xl shadow-4xl ring-3"
        >
          <div className="flex items-center px-4 ">
            <BiSearch className="my-auto cursor-pointer mr-2" />
            <Combobox.Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 w-full border-0 bg-transparent text-sm text-gray-800 placeholder-gray-400 ring-0 outline-none"
              placeholder={
                modifiers.length > 0
                  ? `Search for an ${modifiers
                      .map((a) => a.label)
                      .join("/")}...`
                  : "Search..."
              }
            />
            {modifiers.length > 0 && (
              <>
                {modifiers.map((mod) => (
                  <p
                    onClick={() =>
                      setModifiers(
                        modifiers.filter((mod) => mod.key != mod.key)
                      )
                    }
                    className="text-sm text-gray-600 hover:text-gray-800 cursor-pointer bg-slate-700 px-1 rounded-md mr-1 text-slate-200"
                  >
                    {mod.label}
                  </p>
                ))}
              </>
            )}
          </div>
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Combobox.Options
              static
              className="max-h-96 overflow-y-auto pb-4 text-md border-t-2 border-gray-400 pt-2"
            >
              {Object.keys(orderedActions).map((key, index) => {
                return (
                  <div key={index}>
                    {orderedActions[key].length > 0 && (
                      <>
                        <p className="`space-x-1 px-4 text-gray-400 mb-2">
                          {key === "modify"
                            ? "Filter"
                            : key === "actions"
                            ? "Actions"
                            : extensions?.find((handler) => handler.key == key)
                                ?.label}
                        </p>
                        {orderedActions[key].map((action, index) => (
                          <Combobox.Option key={key + index} value={action}>
                            {({ active }) => (
                              <div
                                className={`flex w-full space-x-1 px-4 py-1 cursor-pointer ${
                                  active && "text-primary-400"
                                }`}
                              >
                                <div className="flex-grow">{action.label}</div>
                                {active && (
                                  <span className="text-sm ml-1 text-gray-400">
                                    {action.description}
                                  </span>
                                )}
                              </div>
                            )}
                          </Combobox.Option>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </Combobox.Options>
            {query.length > 0 && Object.keys(orderedActions).length === 0 && (
              <p className="px-4 pb-4 text-center text-sm text-gray-600">
                No results found
              </p>
            )}
          </Transition>
        </Combobox>
      </Dialog>
    </Transition>
  );
};
