// File: src/features/settings/useSettingsPageViewModel.ts
import { useCallback, useEffect, useState } from "react";
import { OBSConfig } from "../../../electron/types/types";

const defaultConfig: OBSConfig = {
    host: "ws://127.0.0.1:4455",
    password: "",
    retryDelay: 5000,
    google: {
        sheetId: "",
        serviceKeyPath: "",
        defaultSheet: "Luni",
        autoSync: false,
    },
};

export type SettingsPageViewModel = {
    config: OBSConfig;
    loading: boolean;

    saved: boolean;
    setSaved: (v: boolean) => void;

    showPassword: boolean;
    toggleShowPassword: () => void;

    testing: boolean;
    testResult: string | null;
    testConnection: () => Promise<void>;

    syncing: boolean;
    syncMessage: string;
    syncSchedule: () => Promise<void>;

    update: (key: keyof OBSConfig, value: any) => void;
    updateGoogle: (key: keyof OBSConfig["google"], value: any) => void;

    save: () => Promise<void>;
};

export function useSettingsPageViewModel(): SettingsPageViewModel {
    const [config, setConfig] = useState<OBSConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);

    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState("");

    // Load config on mount (behavior unchanged)
    useEffect(() => {
        let mounted = true;

        window.api.config.get().then((data) => {
            if (!mounted) return;
            setConfig(data);
            setLoading(false);
        });

        return () => {
            mounted = false;
        };
    }, []);

    const update = useCallback((key: keyof OBSConfig, value: any) => {
        setConfig((prev) => (prev ? { ...prev, [key]: value } : defaultConfig));
        // behavior unchanged: saved flag not auto-reset in original code; keep same
    }, []);

    const updateGoogle = useCallback((key: keyof OBSConfig["google"], value: any) => {
        setConfig((prev) =>
            prev ? { ...prev, google: { ...prev.google, [key]: value } } : defaultConfig
        );
    }, []);

    const toggleShowPassword = useCallback(() => {
        setShowPassword((v) => !v);
    }, []);

    const syncSchedule = useCallback(async () => {
        setSyncing(true);
        try {
            const result = await window.api.google.syncSchedule();
            setSyncMessage(result.message);
        } finally {
            setSyncing(false);
        }
    }, []);

    const testConnection = useCallback(async () => {
        if (!config) return;
        setTesting(true);
        setTestResult(null);

        try {
            const result = await window.api.google.testConnection(
                config.google.sheetId,
                config.google.serviceKeyPath,
                config.google.defaultSheet
            );
            setTestResult(result.message);
        } finally {
            setTesting(false);
        }
    }, [config]);

    const save = useCallback(async () => {
        if (!config) return;
        const result = await window.api.config.save(config);
        setSaved(result.success);
        if (!result.success) alert("Failed to save config: " + result.error);
    }, [config]);

    return {
        config,
        loading,
        saved,
        setSaved,
        showPassword,
        toggleShowPassword,
        testing,
        testResult,
        testConnection,
        syncing,
        syncMessage,
        syncSchedule,
        update,
        updateGoogle,
        save,
    };
}
