// File: electron\main\google\testConnection.ts
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { logInfo, logError } from "../config/logger";

export async function testGoogleSheetsConnection(
  sheetId: string,
  keyPath: string,
  tabName = "Program"
): Promise<{ success: boolean; message: string }> {
  try {
    if (!sheetId) {
      return { success: false, message: "Missing Google Sheet ID" };
    }
    if (!keyPath) {
      return { success: false, message: "Missing Service Key path" };
    }

    // resolve absolute path
    const fullPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.resolve(process.cwd(), keyPath);

    if (!fs.existsSync(fullPath)) {
      return { success: false, message: `Key file not found at ${fullPath}` };
    }

    // authenticate with the Google Sheets API
    const credentials = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A1:F5`, // fetch small test range
    });

    const values = res.data.values || [];
    logInfo(`✅ Google Sheets connected. Rows read: ${values.length}`);

    return {
      success: true,
      message: `Connected successfully! Read ${values.length} rows from "${tabName}".`,
    };
  } catch (err: any) {
    logError(`❌ Google Sheets test failed: ${err.message}`);
    return { success: false, message: `Failed: ${err.message}` };
  }
}
