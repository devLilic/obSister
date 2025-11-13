
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

export type ScheduleItemStatus =
  | "upcoming"        // încă nu a început, startTime > now
  | "live"            // item-ul este în desfășurare (stream activ)
  | "expired"         // durata a trecut normal
  | "terminated";     // stream oprit manual înainte de expirare

export interface ScheduleItem {
  id: string;
  name: string;
  platform: "facebook" | "youtube" | "multi";
  startTime: string;           // ISO format
  durationMinutes: number;
  fbKey?: string;
  autoStart?: boolean;

  status: ScheduleItemStatus;
}
