import { useDatalayer } from "@jhnnsrs/datalayer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Timestamp from "react-timestamp";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";
import { OptimizedImage } from "../layout/OptimizedImage";
import { PageLayout } from "../layout/PageLayout";
import { Representation } from "../linker";
import { withMikro } from "../mikro/MikroContext";
import {
  DashboardQueryQuery,
  useDashboardQueryQuery,
} from "../mikro/api/graphql";

export const Delayed = ({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setShow(true);
    }, delay);
  }, []);

  return show ? <>{children}</> : <></>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const Live = ({ id }: { id: string }) => {
  const { data: rd } = withMikro(useDashboardQueryQuery)({
    variables: { id, limit: 1, order: "-acquired" },
    pollInterval: 2000,
  });

  const navigate = useNavigate();
  const { s3resolve } = useDatalayer();

  const [data, setData] = useState<DashboardQueryQuery | undefined>(undefined);

  const fillData = async (rd: DashboardQueryQuery) => {
    setData({ ...rd, stage: { ...rd.stage, positions: [] } });

    let x = rd.stage.positions.length;
    for (let x = 0; x < rd.stage.positions.length; x++) {
      setData({
        ...rd,
        stage: {
          ...rd.stage,
          positions: rd?.stage?.positions.slice(0, x + 1).filter(notEmpty),
        },
      });

      await sleep(20000);
    }
  };

  let relativeTo = data?.stage?.positions
    ?.at(0)
    ?.omeros?.at(0)?.acquisitionDate;

  useEffect(() => {
    if (rd) {
      fillData(rd);
    }
  }, [rd]);

  return (
    <PageLayout>
      <div className="flex flex-grow flex-col text-white @container">
        <div className="font-light text-xl flex mr-2 text-slate-2 mb-2">
          Live Monitoring for {data?.stage?.name}
        </div>
        <ResponsiveContainerGrid>
          {data?.stage?.positions?.filter(notEmpty).map((position, index) => {
            let firstOmero = position.omeros?.at(0);
            let firstThumbnail = firstOmero?.representation?.latestThumbnail;

            if (!firstOmero?.representation) {
              return <div className="relative aspect-square"> Looading </div>;
            }

            return (
              <Representation.Smart
                key={index}
                object={firstOmero.representation.id}
                dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
                  `relative rounded aspect-square ${
                    isOver && !isDragging && "border-primary-200 border"
                  } ${isDragging && "ring-primary-200 ring"} ${
                    isSelected && "ring-2 ring-secondary-500"
                  }`
                }
              >
                <div className="relative h-full w-full">
                  {firstThumbnail?.image && (
                    <OptimizedImage
                      src={s3resolve(firstThumbnail.image)}
                      style={{ filter: "brightness(0.7)" }}
                      className="object-cover h-full w-full absolute top-0 left-0 rounded"
                      blurhash={firstThumbnail.blurhash}
                    />
                  )}
                  <div className="px-2 py-2 h-full w-full absolute top-0 left-0 hover:bg-opacity-20 bg-opacity-10 bg-back-999 transition-all ease-in-out duration-200 relative">
                    <Representation.DetailLink
                      object={firstOmero.representation.id}
                      className="z-10 font-bold text-md mb-2 cursor-pointer text-slate-200"
                    >
                      {firstOmero?.acquisitionDate && (
                        <Timestamp
                          date={firstOmero?.acquisitionDate}
                          relative
                          relativeTo={relativeTo}
                        />
                      )}
                    </Representation.DetailLink>
                  </div>
                  <div className="absolute bottom-0 ">
                    <Delayed delay={30000 + index * 1000}>
                      {firstOmero?.representation?.metrics?.map(
                        (metric, index) => (
                          <div
                            key={index}
                            className="ml-2 mb-2 flex flex-row gap-1"
                          >
                            <div className="font-light text-sm  my-auto cursor-pointer text-slate-200">
                              Cell Count
                            </div>
                            <div className="font-bold text-md  my-auto cursor-pointer text-slate-200">
                              {metric?.value}
                            </div>
                          </div>
                        )
                      )}
                    </Delayed>
                  </div>
                </div>
              </Representation.Smart>
            );
          })}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};
