// File: src/hooks/useProfileSwitcherViewModel.ts
import { useOBS } from "../context/OBSContext";

export type ProfileSwitcherViewModel = {
    profiles: string[];
    current: string;
    loading: boolean;
    error?: string;
    switchProfile: (profile: string) => Promise<void>;
};

export function useProfileSwitcherViewModel(): ProfileSwitcherViewModel {
    const { profiles, currentProfile, profilesLoading, profilesError, switchProfile } = useOBS();

    return {
        profiles,
        current: currentProfile,
        loading: profilesLoading,
        error: profilesError,
        switchProfile,
    };
}
