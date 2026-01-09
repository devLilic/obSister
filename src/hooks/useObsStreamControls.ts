// File: src/hooks/useObsStreamControls.ts
import { useCallback } from "react";

export type ObsStreamControls = {
    startStream: (streamKey: string) => void;
    stopStream: () => void;
};

export function useObsStreamControls(): ObsStreamControls {
    const startStream = useCallback((streamKey: string) => {
        // behavior unchanged: same IPC call as before
        window.api.stream.start(streamKey);
    }, []);

    const stopStream = useCallback(() => {
        // behavior unchanged: same IPC call as before
        window.api.stream.stop();
    }, []);

    return { startStream, stopStream };
}
