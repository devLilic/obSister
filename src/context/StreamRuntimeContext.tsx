// File: src/context/StreamRuntimeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { StreamContext } from "../../electron/types/types";

type StreamRuntimeValue = {
    ctx: StreamContext | null;
    loading: boolean;
};

const StreamRuntimeContext = createContext<StreamRuntimeValue | null>(null);

export function StreamRuntimeProvider({ children }: { children: React.ReactNode }) {
    const [ctx, setCtx] = useState<StreamContext | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 1) Snapshot inițial (adevăr instant)
        window.api.stream
            .getContext()
            .then((initial) => {
                if (!mounted) return;
                setCtx(initial);
                setLoading(false);
            })
            .catch(() => {
                if (!mounted) return;
                // nu deducem nimic; doar nu blocăm UI în dev
                setLoading(false);
            });

        // 2) Push updates (adevăr runtime)
        const unsubscribe = window.api.stream.onContext((next) => {
            setCtx(next);       // IMPORTANT: consum exact, fără deducții
            setLoading(false);
        });

        return () => {
            mounted = false;
            unsubscribe(); // ✅ StrictMode safe (evită dublări)
        };
    }, []);

    const value = useMemo(() => ({ ctx, loading }), [ctx, loading]);

    return <StreamRuntimeContext.Provider value={value}>{children}</StreamRuntimeContext.Provider>;
}

export function useStreamRuntime() {
    const v = useContext(StreamRuntimeContext);
    if (!v) throw new Error("useStreamRuntime must be used within StreamRuntimeProvider");
    return v;
}
