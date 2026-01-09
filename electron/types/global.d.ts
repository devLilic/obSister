// filepath: electron/types/global.d.ts
import {
  OBSConfig,
  AutoStopConfig,
  AutoStopStatus,
  StreamContext,
  ScheduleItem,
  ScheduleItemStatus,
  StopFrameFilter,
  StopFrameFilterCreatePayload,
  StopFrameFilterPatch,
  StopFrameNotification,
  AutoStopRuntimeEvent,
} from "./types";

export {};

declare global {
  interface Window {
    api: {
      onOBSStatus: (callback: (connected: boolean) => void) => void;

      obsProfiles: {
        getAll: () => Promise<{ currentProfileName: string; profiles: string[] }>;
        set: (name: string) => Promise<boolean>;
      };

      stream: {
        start: (key: string) => void;
        stop: () => void;
        startSmart: (key: string, mode: "single" | "multi") => Promise<void>;
        getContext: () => Promise<StreamContext>;
        onContext: (callback: (ctx: StreamContext) => void) => () => void;
      };

      onProfileChanged: (callback: (profileName: string) => void) => void;

      schedule: {
        get: () => Promise<ScheduleItem[]>;
        save: (items: ScheduleItem[]) => Promise<boolean>;
        setStatus: (id: string, status: ScheduleItemStatus) => Promise<boolean>;
      };

      config: {
        get: () => Promise<OBSConfig>;
        save: (data: OBSConfig) => Promise<{ success: boolean; error?: string }>;
      };

      logs: {
        load: () => Promise<
            { timestamp: string; level: "info" | "warn" | "error"; message: string }[]
        >;
        clear: () => Promise<{ success: boolean; error?: string }>;
      };

      google: {
        syncSchedule: () => Promise<{ success: boolean; message: string }>;
        testConnection: (
            sheetId: string,
            keyPath: string,
            tabName: string
        ) => Promise<{ success: boolean; message: string }>;
      };

      autoStop: {
        start: () => Promise<void>;
        stop: () => Promise<void>;
        setConfig: (config: AutoStopConfig) => Promise<void>;
        getStatus: () => Promise<AutoStopStatus>;
        selectReferenceImage: () => Promise<string | null>;

        // ✅ runtime events (read-only)
        onRuntimeEvent: (callback: (evt: AutoStopRuntimeEvent) => void) => () => void;
      };

      stopFrames: {
        listFilters: () => Promise<StopFrameFilter[]>;
        createFilter: (payload: StopFrameFilterCreatePayload) => Promise<StopFrameFilter[]>;
        updateFilter: (id: string, patch: StopFrameFilterPatch) => Promise<StopFrameFilter[]>;
        deleteFilter: (id: string) => Promise<StopFrameFilter[]>;
        onChanged: (callback: (filters: StopFrameFilter[]) => void) => () => void;
        onNotification: (callback: (n: StopFrameNotification) => void) => () => void;

        openPreview: (absolutePath: string) => Promise<string | null>;
        selectImage: () => Promise<string | null>;
      };

      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
