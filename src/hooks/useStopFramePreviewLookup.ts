// File: src/hooks/useStopFramePreviewLookup.ts
import { useMemo, useCallback } from "react";
import { useStopFrameFiltersViewModel } from "./useStopFrameFiltersViewModel";

/**
 * UI-only helper: ScheduleList poate cere preview pentru un stopFramePath
 * fără să facă IPC. Preview-urile sunt deja rezolvate/cached în VM-ul filtrelor.
 */
export function useStopFramePreviewLookup() {
    const { filters } = useStopFrameFiltersViewModel();

    const map = useMemo(() => {
        const m = new Map<string, string | null>();
        for (const f of filters) {
            const p = (f.stopFramePath || "").trim();
            if (!p) continue;
            // stopFramePreviewUrl poate fi undefined (încă se încarcă) sau null (invalid)
            // DOAR dacă preview-ul a fost deja rezolvat
            console.log("[stopFrame]", f);
            if (f.stopFramePreviewUrl !== undefined) {
                m.set(p, f.stopFramePreviewUrl); // string | null
            }
        }
        return m;
    }, [filters]);

    const getPreviewForPath = useCallback(
        (path: string | undefined) => {
            const p = (path || "").trim();
            if (!p) return undefined;       // no path -> no preview
            return map.get(p);              // string | null | undefined
        },

        [map]
    );

    return { getPreviewForPath };
}
