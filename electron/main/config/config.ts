import fs from "fs";
import path from "path";
import { app } from "electron";
import { logInfo, logError } from "./logger";
import { OBSConfig } from "../../types/types";


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
    google: {
      sheetId: "",
      serviceKeyPath: "",
      defaultSheet: "Luni",
      autoSync: false,
    },
    autoStop: {
      enabled: false,
      fps: 3,
      threshold: 0.2,
      requiredHits: 3,
      windowSec: 3,
      cooldownSec: 10,
      endingLeadMin: 5,
    }
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
    console.error("Failed to load config:", err);
    logError(`Failed to load config: ${err.message}`);
    return defaultConfig;
  }
}

export function saveConfig(config: OBSConfig) {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}