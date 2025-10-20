import fs from "fs";
import path from "path";
import { app } from "electron";
import { logInfo, logError } from "./logger";

export interface OBSConfig {
  host: string;     // e.g. ws://127.0.0.1:4455
  password: string; // your OBS websocket password
  retryDelay: number; // ms
}

const CONFIG_FILENAME = "config.json";

export function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_FILENAME);
}

export function loadConfig(): OBSConfig {
  const configPath = getConfigPath();

  // Default values (used if file missing)
  const defaultConfig: OBSConfig = {
    host: "ws://127.0.0.1:4455",
    password: "",
    retryDelay: 5000,
  };

  try {
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      logInfo(`Created default config file at ${configPath}`);
      return defaultConfig;
    }

    const data = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(data);
    return { ...defaultConfig, ...parsed };
  } catch (err: any) {
    logError(`Failed to load config: ${err.message}`);
    return defaultConfig;
  }
}
