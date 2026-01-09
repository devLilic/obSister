// File: src/context/ScheduleStatusContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useScheduleStatus } from "../hooks/useScheduleStatus";
import type { ScheduleItem } from "../../electron/types/types";

export type ScheduleStatusState = {
    next: ScheduleItem | null;
    timeToNext: string;
    timeToEnd: string; // helper vizual (afișat doar când Electron spune LIVE)
    refreshStatus: () => void;
};

const ScheduleStatusContext = createContext<ScheduleStatusState | null>(null);

export function ScheduleStatusProvider({ children }: { children: React.ReactNode }) {
    // IMPORTANT: useScheduleStatus este doar next/countdown helper (NU current/live)
    const { next, timeToNext, timeToEnd, refreshStatus } = useScheduleStatus();

    const value = useMemo<ScheduleStatusState>(
        () => ({
            next,
            timeToNext,
            timeToEnd,
            refreshStatus,
        }),
        [next, timeToNext, timeToEnd, refreshStatus]
    );

    return <ScheduleStatusContext.Provider value={value}>{children}</ScheduleStatusContext.Provider>;
}

export function useScheduleStatusState() {
    const ctx = useContext(ScheduleStatusContext);
    if (!ctx) throw new Error("useScheduleStatusState must be used within ScheduleStatusProvider");
    return ctx;
}
