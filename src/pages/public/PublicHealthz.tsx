import { useFakts } from "@jhnnsrs/fakts";
import React from "react";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { PublicNavigationBar } from "../../components/navigation/PublicNavigationBar";
import { useHealthz } from "../../providers/healthz/context";

export interface PublicHomeProps {}

export interface ConfigValues {
  host: string;
}

export const PublicHealthz: React.FC<PublicHomeProps> = (props) => {
  const { load, setFakts } = useFakts();
  const { errors } = useHealthz();

  return (
    <div className="flex flex-col h-screen sm:flex-row-reverse">
      <div className="flex-grow flex flex-col bg-slate-900 overflow-y-auto">
        <main className="mt-10 mx-auto px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28 ">
          <div className="sm:text-center lg:text-left">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block xl:inline text-white">Configuration </span>{" "}
              <span className="block text-red-400 xl:inline drop-shadow-2xl ">
                Error
              </span>
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
              We couldn't establish a connection to all of your Services. Check
              these services or change your fakts
            </p>
            <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
              <ResponsiveGrid>
                {errors?.map((service) => (
                  <div className="bg-white rounded-md shadow p-5 ">
                    <div className="font-light text-xl">{service.name}</div>
                    {service.error ? (
                      Object.entries(service.error).map((entry) => (
                        <div className="text-red-600">
                          {entry[0]}: {entry[1]}
                        </div>
                      ))
                    ) : (
                      <></>
                    )}
                    {service.ok ? (
                      Object.entries(service.ok).map((entry) => (
                        <div className="text-green-600">
                          {entry[0]} : {entry[1]}
                        </div>
                      ))
                    ) : (
                      <></>
                    )}
                  </div>
                ))}
              </ResponsiveGrid>
            </div>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setFakts(null)}
                className="shadow-lg shadow-primary-500/30 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-500 md:py-4 md:text-lg md:px-10"
              >
                Change Config{" "}
              </button>
            </div>
          </div>
        </main>
      </div>
      <div className="flex-initial sm:flex-initial sm:static sm:w-20 bg-slate-900">
        <PublicNavigationBar />
      </div>
    </div>
  );
};
