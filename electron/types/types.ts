// filepath: electron/types/types.ts

export interface OBSConfig {
  host: string;
  password: string;
  retryDelay: number;
  google: {
    sheetId: string;
    serviceKeyPath: string;
    defaultSheet: string;
    autoSync: boolean;
  };
}

/* ===============================
   STREAM RUNTIME TRUTH
   =============================== */

// ✅ Added "autostop" as allowed end reason (required by runtime enforcement)
export type StreamEndReason = "manual" | "duration" | "obs_crash" | "autostop";

export type StreamState = "idle" | "live" | "ending" | "ended";

export type StreamContext = {
  streamState: StreamState;
  streamEndReason?: StreamEndReason;
  activeScheduleItemId: string | null;
  hasStopFrame: boolean;
};

/* ===============================
   STOPFRAME FILTER GROUPS
   =============================== */

export type StopFrameFilter = {
  id: string;
  name: string;
  enabled: boolean;
  shows: string[];
  stopFramePath: string;
};

export type StopFrameFilterCreatePayload = Omit<StopFrameFilter, "id">;

export type StopFrameFilterPatch = Partial<
    Pick<StopFrameFilter, "name" | "enabled" | "shows" | "stopFramePath">
>;

export type StopFrameNotification =
    | {
  type: "CONFLICT";
  show: string;
  filterIds: string[];
  filterNames: string[];
}
    | {
  type: "FILTER_DISABLED_INVALID_STOPFRAME";
  filterId: string;
  filterName: string;
  stopFramePath: string;
  reason: "empty_path" | "missing_file";
};

/* ===============================
   AUTOSTOP RUNTIME EVENTS (PHASE 5A)
   =============================== */

export type AutoStopRuntimeEvent =
    | { type: "scan_started"; itemId: string }
    | {
  type: "scan_stopped";
  itemId: string;
  reason: "manual" | "duration" | "obs_crash" | "stopframe_detected";
}
    | { type: "stopframe_detected"; itemId: string }
    | { type: "stream_stop_sent"; itemId: string };

/* ===============================
   APP ACTION TYPES (LOGGING)
   =============================== */

export type AppActionType =
    | "stream_state_changed"
    | "stream_stop_manual"
    | "stream_stop_duration"
    | "stream_end_obs_crash"
    | "stream_stop_autostop"
    | "stopframe_filters_loaded"
    | "stopframe_filters_missing"
    | "stopframe_filters_invalid"
    | "stopframe_filters_saved"
    | "stopframe_filters_conflict"
    | "stopframe_filter_disabled_invalid"
    | "stopframe_filters_applied_to_schedule"
    | "auto_start_blocked_already_live"
    // AutoStop runtime enforcement actions
    | "autostop_guard_not_started"
    | "autostop_virtualcam_start"
    | "autostop_virtualcam_stop"
    | "autostop_scan_started"
    | "autostop_scan_stopped"
    | "autostop_stopframe_detected"
    | "autostop_stream_stop_sent";

/* ===============================
   AUTO-STOP STREAM
   =============================== */

export type AutoStopConfig = {
  enabled: boolean;
  fps: number;
  threshold: number;
  requiredHits: number;
  windowSec: number;
  cooldownSec: number;

  /**
   * Runtime enforcement: scan only in last N minutes of the show.
   * Default: 5 minutes.
   */
  endingLeadMin?: number;

  /**
   * (legacy, still supported) reference image path from UI.
   * Runtime enforcement will override reference per active schedule item (stopFramePath).
   */
  referenceImagePath?: string;

  crop?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

export type AutoStopStatus = {
  running: boolean;
  enabled: boolean;
};

/* ===============================
   SCHEDULE
   =============================== */

export type ScheduleItemStatus =
    | "upcoming"
    | "live"
    | "expired"
    | "terminated"
    | "skipped";

export type ScheduleSkipReason = "already_live_manual";

export interface ScheduleItem {
  id: string;
  name: string;
  platform: "facebook" | "youtube" | "multi";
  startTime: string;
  durationMinutes: number;
  fbKey?: string;
  autoStart?: boolean;
  status: ScheduleItemStatus;
  skipReason?: ScheduleSkipReason;

  // Applied before saving schedule.json
  stopFramePath?: string;
}
