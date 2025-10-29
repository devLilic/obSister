import { OBSConfig } from "./types";

export {};

declare global {
  interface Window {
    api: {
      // -----------------------------
      // ✅ OBS STATUS
      // -----------------------------
      /**
       * Listen for OBS connection status changes.
       */
      onOBSStatus: (callback: (connected: boolean) => void) => void;

      // -----------------------------
      // ✅ OBS PROFILES
      // -----------------------------
      obsProfiles: {
        /**
         * Get all profiles and the currently active one.
         * @returns {Promise<{ currentProfileName: string; profiles: string[] }>}
         */
        getAll: () => Promise<{ currentProfileName: string; profiles: string[] }>;

        /**
         * Set (switch to) a specific OBS profile.
         */
        set: (name: string) => Promise<boolean>;
      };

      // -----------------------------
      // ✅ STREAM CONTROL
      // -----------------------------
      stream: {
        /**
         * Start a simple Facebook stream.
         */
        start: (key: string) => void;

        /**
         * Stop the current stream.
         */
        stop: () => void;

        /**
         * Start a stream and ensure the correct profile before streaming.
         * @param key The RTMP key (Facebook Live key)
         * @param mode "single" for FB only, "multi" for FB + YT
         */
        startSmart: (key: string, mode: "single" | "multi") => Promise<void>;
      };

      // -----------------------------
      // ✅ OBS PROFILE CHANGE EVENTS
      // -----------------------------
      /**
       * Listen for profile changes in OBS (manual or automatic).
       */
      onProfileChanged: (callback: (profileName: string) => void) => void;

      // -----------------------------
      // ✅ SCHEDULE MANAGEMENT
      // -----------------------------
      schedule: {
        /**
         * Get all scheduled stream items.
         * @returns Promise<ScheduleItem[]>
         */
        get: () => Promise<
          {
            id: string;
            name: string;
            platform: "facebook" | "youtube" | "multi";
            startTime: string;
            durationMinutes: number;
            fbKey?: string;
            autoStart?: boolean;
          }[]
        >;

        /**
         * Save or update the list of scheduled stream items.
         */
        save: (
          items: {
            id: string;
            name: string;
            platform: "facebook" | "youtube" | "multi";
            startTime: string;
            durationMinutes: number;
            fbKey?: string;
            autoStart?: boolean;
          }[]
        ) => Promise<boolean>;
      };

      config: {
        get: () => Promise<OBSConfig>;
        save: (data: OBSConfig) => Promise<{ success: boolean; error?: string }>;
      };

      logs: {
        load: () => Promise<{ timestamp: string; level: "info" | "warn" | "error"; message: string }[]>;
        clear: () => Promise<{ success: boolean; error?: string }>;
      };

      // -----------------------------
      // ⚙️ GENERIC IPC HELPERS
      // -----------------------------
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    google: {
      testConnection: (
        sheetId: string,
        keyPath: string,
        tabName: string
      ) => Promise<{ success: boolean; message: string }>;
      syncSchedule: () => Promise<{ success: boolean; message: string }>;
    };
  }
}
