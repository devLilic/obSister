// electron/main/app.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { startMain } from "./bootstrap";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, "public")
    : RENDERER_DIST;

// Delegate Electron lifecycle + orchestration to bootstrap
startMain({
  __dirname,
  VITE_DEV_SERVER_URL,
  RENDERER_DIST,
  VITE_PUBLIC: process.env.VITE_PUBLIC || "",
});
