// FILE: electron/main/features/autoStop/analyzer.ts
import { logInfo } from "../../config/logger";

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
 */
export function logMatchDebug(frameIndex: number, distance: number, maxDistance: number) {
    logInfo(`🧪 Frame #${frameIndex} dHashDistance=${distance} maxAllowed=${maxDistance}`);
}
