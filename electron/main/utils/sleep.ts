// electron/main/utils/sleep.ts
export function sleep(ms: number): Promise<void> {
    const n = typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
    if (n <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, n));
}
