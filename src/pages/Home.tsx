import { useNavigate } from "react-router";
import { useHerre } from "../herre";
import { MikroLink, RekuestLink } from "../linker";

interface Props {}

export const Home = (props: Props) => {
  const { user } = useHerre();
  const navigate = useNavigate();

  return (
    <main className="mt-10 mx-auto px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
      <div className="sm:text-center lg:text-left">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline dark:text-white">Hey </span>{" "}
          <span className="block text-primary-300 xl:inline drop-shadow-2xl ">
            {user?.preferred_username}
          </span>
        </h1>
        <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
          Look at your Data or construct your Arkitekture
        </p>
        <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
          <div className="rounded-md shadow">
            <MikroLink className="w-full shadow-lg shadow-primary-300/60 flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md dark:text-white text-back-700 border-primary-400 bg-primary-300 hover:bg-primary-400 md:py-4 md:text-lg md:px-10">
              Open Data
            </MikroLink>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-3">
            <RekuestLink className="w-full flex items-center justify-center  border-gray-500  border-dotted shadow-lg shadow-white/30 px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10">
              Dashboard
            </RekuestLink>
          </div>
        </div>
      </div>
    </main>
  );
};
