/// <reference types="vite-plugin-electron/electron-env" />

// declare namespace NodeJS {
//   interface ProcessEnv {
//     /**
//      * The built directory structure
//      *
//      * ```tree
//      * ├─┬─┬ dist
//      * │ │ └── index.html
//      * │ │
//      * │ ├─┬ dist-electron
//      * │ │ ├── main.js
//      * │ │ └── preload.js
//      * │
//      * ```
//      */
//     APP_ROOT: string
//     /** /dist/ or /public/ */
//     VITE_PUBLIC: string
//   }
// }

// // Used in Renderer process, expose in `preload.ts`
// interface Window {
//   ipcRenderer: import('electron').IpcRenderer
// }
declare global {
  interface window {
    api: {
      // Generic IPC helpers
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;

      // OBS status listener
      onOBSStatus: (callback: (status: boolean) => void) => void;

      // Stream control
      startStream: (key: string) => void;
      stopStream: () => void;

      // Profiles
      obsProfiles?: {
        getAll: () => Promise<{ currentProfileName: string; profiles: string[] }>;
        set: (name: string) => Promise<boolean>;
      };

      // (Optional) Debug or test calls
      testGetInputs?: () => Promise<any>;
    };
  }
}
