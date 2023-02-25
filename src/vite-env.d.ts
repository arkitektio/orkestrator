/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare module "uuid" {
  export function v4(): string;
}
declare interface Window {
  __TAURI__?: any;
}

declare module "use-react-screenshot";
declare module "rdndmb-html5-to-touch";
declare module "js-colormaps";
declare module "react-scroll-percentage";
