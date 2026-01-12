import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { loadConfig } from "../config/config";
import { saveSchedule } from "../schedule/store";
import { getTodaySheetName } from "./utils";
import {logError, logInfo} from "../config/logger.ts";
import {ScheduleItem} from "../../types/types.ts";


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
    const schedule = rows.filter(r => r[0] && r[1] && r[2] && r[5]).map((r, i) => {
      const [title, start, duration, fb, yt, fbKey] = r;

      // Safely check for "true" strings
      const isFb = String(fb || "").toLowerCase() === "true";
      const isYt = String(yt || "").toLowerCase() === "true";

      let platform: "facebook" | "youtube" | "multi" = "facebook";
      if (isFb && isYt) platform = "multi";
      else if (isYt) platform = "youtube";

      const [h, m] = (start || "00:00").split(":").map(Number);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const hh = String(h).padStart(2, "0");
      const mi = String(m).padStart(2, "0");

      // ✅ Build local datetime string, no UTC shift, no "Z"
      const localDateTime = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;

      const item: ScheduleItem = {
        id: `${title}-${i}`,
        name: title || "Untitled",
        startTime: localDateTime,            // ✅ clean local format
        durationMinutes: parseInt(duration || "0", 10),
        platform: platform,
        fbKey: fbKey || "",
        status: "upcoming",
      };
      return item;
    });

    // Save schedule file locally
    saveSchedule(schedule);

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
