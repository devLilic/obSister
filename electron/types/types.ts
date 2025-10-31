
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


export interface ScheduleItem {
  id: string;
  name: string;
  platform: "facebook" | "youtube" | "multi";
  startTime: string;         // ISO string
  durationMinutes: number;
  fbKey?: string;
  autoStart?: boolean;
}
