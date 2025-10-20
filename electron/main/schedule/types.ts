export interface ScheduleItem {
  id: string;
  name: string;
  platform: "facebook" | "youtube" | "multi";
  startTime: string;         // ISO string
  durationMinutes: number;
  fbKey?: string;
  autoStart?: boolean;
}
