import { AiOutlineReload } from "react-icons/ai";
import { FiPlay } from "react-icons/fi";
import { RiStopLine } from "react-icons/ri";
import ReactSlider from "react-slider";
import Timestamp from "react-timestamp";

export const BottomSlider = ({
  setPlay,
  setT,
  rangeEvents,
  refetch,
  setLive,
  live,
  play,
  t,
  range,
}: {
  t: any;
  setT: any;
  setPlay: any;
  rangeEvents: any;
  range: any;
  refetch: any;
  play: any;
  setLive: any;
  live: any;
}) => {
  <div className="flex-initial flex row pl-3 pr-3">
    <div
      className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
      onClick={() => refetch()}
    >
      {<AiOutlineReload />}
    </div>
    <div
      className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
      onClick={() => setPlay(!play)}
    >
      {play ? <RiStopLine size={"1em"} /> : <FiPlay size={"1em"} />}
    </div>
    <div
      className="flex-initial my-auto mr-4 dark:text-white cursor-pointer"
      onClick={() => setLive(!live)}
    >
      {live ? "IS live" : "is past"}
    </div>
    <div className="flex-grow">
      <ReactSlider
        className="horizontal-slider"
        thumbClassName="example-thumb rounded text-white border-[5px] border border-gray-100 transition-all duration-300 ease-linear"
        markClassName="example-thumb border border-indigo-700 bg-indigo-500 cursor-pointer rounded-xs "
        trackClassName="example-track bg-gray-700 cursor-pointer"
        onChange={(val) => {
          setT(val), setPlay(false);
        }}
        value={t}
        step={1}
        renderMark={(props) => <div {...props}></div>}
        renderThumb={(props, state) => (
          <div
            {...props}
            key={props.key}
            className={props.className + "group relative"}
          >
            <div className="absolute bottom-1  group-hover:block -translate-x-[50%] w-[10rem] p-2 text-center  rounded">
              <Timestamp
                relative
                date={
                  rangeEvents.find((e) => e?.t === state.valueNow)?.createdAt
                }
              />
            </div>
          </div>
        )}
        marks={range.marks}
        max={range.max}
        min={range.min}
      />
    </div>
  </div>;
};
