// File: src/hooks/useLogsPanelViewModel.ts
import { useCallback, useEffect, useState } from "react";

export interface LogMessage {
    timestamp: string;
    level: "info" | "warn" | "error";
    message: string;
}

export type LogsPanelViewModel = {
    logs: LogMessage[];
    clearLogs: () => Promise<void>;
};

export function useLogsPanelViewModel(): LogsPanelViewModel {
    const [logs, setLogs] = useState<LogMessage[]>([]);

    // Load saved logs when app starts + subscribe for live logs
    useEffect(() => {
        let mounted = true;

        (async () => {
            const previous = await window.api.logs.load();
            if (mounted && previous?.length) setLogs(previous);
        })();

        const handleLog = (_event: any, data: any) => {
            if (!data || !data.message) return;
            setLogs((prev) => [...prev.slice(-199), data]);
        };

        window.api.on("log-message", handleLog);
        return () => {
            mounted = false;
            window.api.off("log-message", handleLog);
        };
    }, []);

    const clearLogs = useCallback(async () => {
        const result = await window.api.logs.clear();
        if (result.success) setLogs([]);
        else alert("Failed to clear logs: " + result.error);
    }, []);

    return { logs, clearLogs };
}
