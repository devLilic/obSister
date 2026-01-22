// File: electron\main\obs\profile.ts
import { obs } from "./connection";
import { logInfo, logError } from "../config/logger";

export async function getProfileList() {
  if (!obs || !(await obs.call("GetVersion").catch(() => false))) {
    logError("⚠️ OBS not connected or not authenticated");
    return { currentProfileName: "", profiles: [] };
  }
  try {
    const res = await obs.call("GetProfileList");
    logInfo(`📋 Profiles: ${res.profiles.join(", ")} | Current: ${res.currentProfileName}`);
    return res;
  } catch (error: any) {
    logError(`Failed to get profile list: ${error.message}`);
    return { currentProfileName: "", profiles: [] };
  }
}

export async function setCurrentProfile(profileName: string) {
  try {
    await obs.call("SetCurrentProfile", { profileName });
    logInfo(`🔄 Switched to profile: ${profileName}`);
    return true;
  } catch (error: any) {
    logError(`Failed to set profile "${profileName}": ${error.message}`);
    return false;
  }
}

/**
 * Ensure OBS is using the correct profile before streaming.
 */
export async function ensureProfile(required: string) {
  try {
    const { currentProfileName, profiles } = await getProfileList();
    if (currentProfileName === required) {
      logInfo(`✅ Correct profile "${required}" already active`);
      return true;
    }
    if (!profiles.includes(required)) {
      logError(`❌ Profile "${required}" not found`);
      return false;
    }
    logInfo(`🔁 Switching profile to "${required}"...`);
    await setCurrentProfile(required);
    await new Promise(res => setTimeout(res, 2000)); // give OBS time
    logInfo(`✅ Profile changed to "${required}"`);
    return true;
  } catch (error: any) {
    logError(`ensureProfile failed: ${error.message}`);
    return false;
  }
}
