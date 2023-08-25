import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";

export const DisconnectButton = () => {
  const { logout } = useHerre();
  const { fakts, setFakts } = useFakts();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          logout();
          setFakts(null);
        }}
        className="w-full flex items-center justify-center  border-gray-500  border-dotted shadow-lg shadow-white/30 px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
      >
        Disconnect from {fakts.self.name}
      </button>
    </>
  );
};
