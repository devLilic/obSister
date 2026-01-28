// FILE: tools/autostop-lab/src/timecode.ts
export function toTimecode(tSec: number): string {
    const totalMs = Math.max(0, Math.round(tSec * 1000));
    const ms = totalMs % 1000;

    const totalS = Math.floor(totalMs / 1000);
    const s = totalS % 60;

    const totalM = Math.floor(totalS / 60);
    const m = totalM % 60;

    const h = Math.floor(totalM / 60);

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const pad3 = (n: number) => String(n).padStart(3, "0");

    return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}`;
}
