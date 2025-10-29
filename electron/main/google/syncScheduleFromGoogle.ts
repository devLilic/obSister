import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { app } from "electron";
import { loadConfig } from "../config/config";
import { logInfo, logError } from "../config/logger";
import { getTodaySheetName } from "./utils";

export async function syncScheduleFromGoogle() {
  const cfg = loadConfig();
  const googleCfg = cfg.google;

  if (!googleCfg?.sheetId || !googleCfg?.serviceKeyPath) {
    logError("Google config missing. Please set up in Settings.");
    return { success: false, message: "Google config missing" };
  }

  const todaySheet = getTodaySheetName();
  logInfo(`📅 Reading today's sheet: ${todaySheet}`);

  try {
    // Resolve path to credentials file
    const fullPath = path.isAbsolute(googleCfg.serviceKeyPath)
      ? googleCfg.serviceKeyPath
      : path.resolve(process.cwd(), googleCfg.serviceKeyPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Service key file not found: ${fullPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Read all rows from today's sheet
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: googleCfg.sheetId,
      range: `${todaySheet}!A3:F`,
    });

    const rows = res.data.values || [];
    if (!rows.length) {
      logError(`No rows found in sheet "${todaySheet}".`);
      return { success: false, message: "No rows found" };
    }

    // Convert Google rows to obSister schedule
    const schedule = rows.map((r, i) => {
      const [title, start, duration, fb, yt, fbKey] = r;
      const platforms =
        fb.toLowerCase() === "true" && yt.toLowerCase() === "true" ? "multi" : "facebook";

      const [h, m] = (start || "00:00").split(":").map(Number);
      const startTime = new Date();
      startTime.setHours(h, m, 0, 0);

      return {
        id: `${title}-${i}`,
        name: title || "Untitled",
        startTime: startTime.toISOString(),
        durationMinutes: parseInt(duration || "0", 10),
        platform: platforms,
        fbKey: fbKey || "",
      };
    });

    // Save schedule file locally
    const savePath = path.join(app.getPath("userData"), "schedule.json");
    fs.writeFileSync(savePath, JSON.stringify(schedule, null, 2));

    logInfo(`✅ Synced ${schedule.length} programs from "${todaySheet}".`);
    return {
      success: true,
      message: `Loaded ${schedule.length} programs from ${todaySheet}`,
    };
  } catch (err: any) {
    logError(`❌ Google sync failed: ${err.message}`);
    return { success: false, message: `Error: ${err.message}` };
  }
}
