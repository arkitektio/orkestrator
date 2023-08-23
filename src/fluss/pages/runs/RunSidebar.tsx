import { Maybe } from "graphql/jsutils/Maybe";
import * as React from "react";
import TimeStamp from "react-timestamp";
import { RunState } from "../../../floating/types";
import { notEmpty } from "../../../floating/utils";
import { RunEventFragment, RunFragment } from "../../../fluss/api/graphql";
interface IAppProps {
  run: Maybe<RunFragment>;
  runState: RunState;
  latestEvent: RunEventFragment | null | undefined;
}

const RunSidebar: React.FunctionComponent<IAppProps> = (props) => {
  const [filter, setFilter] = React.useState<{ search?: string }>({
    search: "",
  });

  React.useEffect(() => {
    console.log(filter);
  }, [filter, fetch]);

  return (
    <div className="flex flex-col gap-2  pt-6 h-full">
      <div className="flex-grow p-5 dark:text-slate-50">
        <div className="mt-2">
          <div className="border border-gray-600 p-2 rounded">
            <div className="flex flex-col">
              <div className="font-light text-xl">
                Run for {props.run?.flow?.name}
              </div>
              <div className="font-light text-xs">
                Last Save:{" "}
                <TimeStamp date={props.run?.latestSnapshot?.createdAt} />
              </div>
              {props.latestEvent && (
                <>{JSON.stringify(props.latestEvent.value)}</>
              )}
              <div className="font-light text-xs">
                {props?.runState?.events && (
                  <>
                    {props?.runState?.events?.filter(notEmpty).map((event) => (
                      <div key={event.id} className="flex flex-col">
                        <div className="font-light text-xs">
                          <TimeStamp date={event?.createdAt} />
                        </div>
                        {JSON.stringify(event.value)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunSidebar;
