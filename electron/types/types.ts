
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