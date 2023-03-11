import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";

export const WebLogin: React.FC<{}> = (props) => {
  const { fakts, setFakts } = useFakts();

  const { login, isAuthenticating } = useHerre();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          login(
            {
              clientId: fakts.lok.client_id,
              clientSecret: fakts.lok.client_secret,
              scopes: fakts.lok.scopes,
              redirectUri: window.location.origin + "/callback",
            },
            {
              base_url: fakts.lok.base_url,
              tokenUrl: fakts.lok.base_url + "/token/",
              userInfoEndpoint: fakts.lok.base_url + "/userinfo/",
              authUrl: fakts.lok.base_url + "/authorize/",
            }
          )
        }
        className="w-full shadow-lg shadow-primary-300/60 flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md dark:text-white text-back-700 border-primary-400 bg-primary-300 hover:bg-primary-400 md:py-4 md:text-lg md:px-10"
      >
        {isAuthenticating ? "Logging in..." : "Login"}
      </button>
    </>
  );
};
