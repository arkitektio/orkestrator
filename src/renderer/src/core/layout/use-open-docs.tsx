import { useLocation } from "react-router-dom";


export const useOpenDocs = () => {
  const location = useLocation();

  const openDocs = () => {
    window.api.openWebbrowser("https://arkitekt.live/docs?orkestrator=" + encodeURIComponent(location.pathname));
  }

  return openDocs;
}
