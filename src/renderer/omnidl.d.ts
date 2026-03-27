import type { OmnidlApi } from "../../electron/preload/index";

declare global {
  interface Window {
    omnidl: OmnidlApi;
  }
}

export {};
