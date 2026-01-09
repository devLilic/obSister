// File: src/context/OBSContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useOBSConnection } from "../hooks/useOBSConnection";
import { useProfiles } from "../hooks/useProfiles";

type OBSContextValue = {
    // Connection
    connected: boolean;
    reconnecting: boolean;

    // Profiles
    profiles: string[];
    currentProfile: string;
    profilesLoading: boolean;
    profilesError?: string;

    switchProfile: (profile: string) => Promise<void>;
    reloadProfiles: () => Promise<void>;
};

const OBSContext = createContext<OBSContextValue | null>(null);

export function OBSProvider({ children }: { children: React.ReactNode }) {
    // Single subscription for OBS status (used by multiple UI components)
    const { connected, reconnecting } = useOBSConnection();

    // Single subscription for profiles (and profile-changed event)
    const { profiles, current, loading, error, switchProfile, reloadProfiles } = useProfiles();

    const value = useMemo<OBSContextValue>(
        () => ({
            connected,
            reconnecting,
            profiles,
            currentProfile: current,
            profilesLoading: loading,
            profilesError: error,
            switchProfile,
            reloadProfiles,
        }),
        [connected, reconnecting, profiles, current, loading, error, switchProfile, reloadProfiles]
    );

    return <OBSContext.Provider value={value}>{children}</OBSContext.Provider>;
}

export function useOBS() {
    const ctx = useContext(OBSContext);
    if (!ctx) throw new Error("useOBS must be used within OBSProvider");
    return ctx;
}
