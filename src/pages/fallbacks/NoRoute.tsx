import { useLocation, useNavigate } from "react-router";

interface Props {}

export const NoRoute = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <main className="mt-10 mx-auto px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28 h-screen">
      <div className="sm:text-center lg:text-left">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline dark:text-white">uuups</span>{" "}
          <span className="block text-primary-300 xl:inline drop-shadow-2xl ">
            i can't find this one
          </span>
        </h1>
        <span className="text-gray-500">
          {location.pathname} does not exist
        </span>
        <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
          If you are sure this route should exist. Please open an issue :)
        </p>
        <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
          <div className="rounded-md shadow">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full shadow-lg shadow-primary-500/30 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-400 md:py-4 md:text-lg md:px-10"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
