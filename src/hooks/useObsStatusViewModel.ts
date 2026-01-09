// File: src/hooks/useObsStatusViewModel.ts
import { useOBS } from "../context/OBSContext";

export type ObsStatusViewModel = {
    connected: boolean;
    reconnecting: boolean;
};

export function useObsStatusViewModel(): ObsStatusViewModel {
    const { connected, reconnecting } = useOBS();
    return { connected, reconnecting };
}
