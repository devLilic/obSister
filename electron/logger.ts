import log from "electron-log";
import path from "path";
import fs from "fs";
import { app } from "electron";

const logDir = path.join(app.getPath("userData"), "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

log.transports.file.resolvePathFn = () => path.join(logDir, "obSister.log");
log.transports.file.level = "info";
log.transports.console.level = "info";

export function logInfo(message: string) {
  log.info(message);
}
export function logError(message: string) {
  log.error(message);
}
export function logWarn(message: string) {
  log.warn(message);
}

export default log;
