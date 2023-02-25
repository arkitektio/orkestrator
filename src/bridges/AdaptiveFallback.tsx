import { PublicFakts } from "../pages/public/PublicFakts"
import { TauriFaktsFallback } from "./TauriFaktsFallback"


export const AdaptiveFaktsFallback = (props: any) => { 

    return window.__TAURI__ ? (
        <TauriFaktsFallback />
      ) : (
        <PublicFakts />
      )

}