// FILE: electron/main/features/autoStop/logic/index.ts

/**
 * Logic-only entrypoint for Node/CLI tools.
 * - No Electron imports
 * - No OBS / IPC / ffmpeg
 * - No side-effects beyond re-exports
 */

export { DecisionEngine, setAutoStopLogicLogger } from "../decisionEngine";
export {
    dHashFromGray9x8,
    hammingDistance64,
    logMatchDebug,
    setAutoStopAnalyzerLogger,
} from "../analyzer";

// Re-export relevant AutoStop types (pure types file, Node-safe)
export type { AutoStopConfig, AutoStopStatus } from "../../../../types/types";
