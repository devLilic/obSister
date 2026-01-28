// FILE: electron/main/features/autoStop/analyzer.ts
/**
 * Logger seam (Node-safe):
 * - In Electron runtime, we try to auto-wire to ../../config/logger via dynamic import.
 * - In Node/CLI (no Electron), this remains no-op by default.
 * - Optional override via setAutoStopAnalyzerLogger().
 */
export type AutoStopAnalyzerLogger = {
    logInfo?: (message: string) => void;
};

let analyzerLogger: Required<AutoStopAnalyzerLogger> = {
    logInfo: () => {},
};

// Best-effort auto-wire to Electron logger WITHOUT hard dependency.
// If it fails (e.g., Node CLI without 'electron'), we keep no-op.
try {
    const mod: any = await import("../../config/logger");
    if (typeof mod?.logInfo === "function") {
        analyzerLogger = { logInfo: mod.logInfo.bind(mod) };
    }
} catch {
    // no-op in CLI / non-Electron contexts
}

/**
 * Optional injection (tests / CLI can set this explicitly).
 * Passing null resets to no-op (and does NOT attempt Electron auto-wire again).
 */
export function setAutoStopAnalyzerLogger(next: AutoStopAnalyzerLogger | null) {
    if (!next) {
        analyzerLogger = { logInfo: () => {} };
        return;
    }
    analyzerLogger = {
        logInfo: typeof next.logInfo === "function" ? next.logInfo : () => {},
    };
}

/**
 * Compute dHash from a 9x8 grayscale image buffer (72 bytes).
 * dHash compares adjacent pixels horizontally => 8 comparisons per row * 8 rows = 64 bits.
 */
export function dHashFromGray9x8(gray: Buffer): bigint {
    if (gray.length !== 72) {
        throw new Error(`Expected 72 bytes (9x8 gray), got ${gray.length}`);
    }

    let bits = 0n;
    let bitPos = 0n;

    // rows: 0..7, cols: 0..7 compare col vs col+1
    for (let y = 0; y < 8; y++) {
        const rowOff = y * 9;
        for (let x = 0; x < 8; x++) {
            const left = gray[rowOff + x];
            const right = gray[rowOff + x + 1];
            const isGreater = left > right ? 1n : 0n;
            bits |= isGreater << bitPos;
            bitPos++;
        }
    }

    return bits;
}

export function hammingDistance64(a: bigint, b: bigint): number {
    let x = a ^ b;
    let count = 0;
    while (x) {
        x &= x - 1n;
        count++;
    }
    return count;
}

/**
 * Utility logger for tuning.
 * Semantics preserved: same message format; now routed via optional logger.
 */
export function logMatchDebug(frameIndex: number, distance: number, maxDistance: number) {
    analyzerLogger.logInfo(`🧪 Frame #${frameIndex} dHashDistance=${distance} maxAllowed=${maxDistance}`);
}
