// File: src/hooks/useStopFrameFiltersViewModel.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSchedule } from "../context/ScheduleContext";
import type { StopFrameFilter, StopFrameNotification } from "../../electron/types/types";

type CreateFilterInput = {
    name: string;
    enabled: boolean;
    shows: string[];
    stopFramePath: string;
};

type UpdateFilterPatch = Partial<{
    name: string;
    enabled: boolean;
    shows: string[];
    stopFramePath: string;
}>;

export type StopFrameConflict = {
    show: string;
    filterIds: string[];
    filterNames: string[];
};

export type StopFrameFilterUI = StopFrameFilter & {
    stopFramePreviewUrl?: string | null; // dataUrl|null (din cache/IPC)
};

export type StopFrameFiltersViewModel = {
    // data (UI-ready, include preview)
    filters: StopFrameFilterUI[];
    loading: boolean;
    error: string | null;

    // notifications (push from Electron)
    notifications: StopFrameNotification[];

    // UI options
    showOptions: string[];

    // UI validation (extra, React-only)
    conflicts: StopFrameConflict[];
    hasBlockingConflicts: boolean;
    blockingMessage: string | null;

    // actions
    reload: () => Promise<void>;
    createFilter: (input: CreateFilterInput) => Promise<void>;
    updateFilter: (id: string, patch: UpdateFilterPatch) => Promise<void>;
    deleteFilter: (id: string) => Promise<void>;
    toggleEnabled: (id: string) => Promise<void>;

    // FAZA 4D
    selectStopFrameImage: () => Promise<string | null>;
};

function normalizeShows(shows: string[]): string[] {
    const cleaned = shows
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    return Array.from(new Set(cleaned));
}

function computeConflicts(filters: StopFrameFilter[]): StopFrameConflict[] {
    const enabled = filters.filter((f) => f.enabled);

    const showToFilters = new Map<string, StopFrameFilter[]>();
    for (const f of enabled) {
        for (const show of f.shows || []) {
            const arr = showToFilters.get(show) ?? [];
            arr.push(f);
            showToFilters.set(show, arr);
        }
    }

    const conflicts: StopFrameConflict[] = [];
    for (const [show, fs] of showToFilters.entries()) {
        if (fs.length >= 2) {
            conflicts.push({
                show,
                filterIds: fs.map((x) => x.id),
                filterNames: fs.map((x) => x.name),
            });
        }
    }

    conflicts.sort((a, b) => a.show.localeCompare(b.show));
    return conflicts;
}

function wouldIntroduceConflicts(nextFilters: StopFrameFilter[]): {
    blocked: boolean;
    message: string | null;
    conflicts: StopFrameConflict[];
} {
    const conflicts = computeConflicts(nextFilters);
    if (conflicts.length === 0) return { blocked: false, message: null, conflicts };

    const first = conflicts[0];
    const msg =
        `Show "${first.show}" exists in multiple enabled filters: ` +
        `${first.filterNames.join(", ")}.`;

    return { blocked: true, message: msg, conflicts };
}

export function useStopFrameFiltersViewModel(): StopFrameFiltersViewModel {
    const { items } = useSchedule();

    const [filtersRaw, setFiltersRaw] = useState<StopFrameFilter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [notifications, setNotifications] = useState<StopFrameNotification[]>([]);
    const [blockingMessage, setBlockingMessage] = useState<string | null>(null);

    // ✅ FAZA 4D: cache preview per path (stable across renders)
    const previewCacheRef = useRef<Map<string, string | null>>(new Map());
    // trigger re-render when cache updates
    const [previewVersion, setPreviewVersion] = useState(0);

    // track previous path per filter id to invalidate cache on changes
    const prevPathByIdRef = useRef<Map<string, string>>(new Map());

    const mountedRef = useRef(true);

    const showOptions = useMemo(() => {
        const names = items
            .map((i) => (i.name ?? "").trim())
            .filter((n) => n.length > 0);
        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    }, [items]);

    const conflicts = useMemo(() => computeConflicts(filtersRaw), [filtersRaw]);
    const hasBlockingConflicts = conflicts.length > 0;

    // UI-ready filters with preview resolved from cache
    const filters: StopFrameFilterUI[] = useMemo(() => {
        const cache = previewCacheRef.current;
        return filtersRaw.map((f) => {
            const path = (f.stopFramePath || "").trim();
            const stopFramePreviewUrl = path ? cache.get(path) : undefined;
            return { ...f, stopFramePreviewUrl };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersRaw, previewVersion]);

    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const list = await window.api.stopFrames.listFilters();
            if (!mountedRef.current) return;
            setFiltersRaw(list || []);
            setBlockingMessage(null);
        } catch (e: any) {
            if (!mountedRef.current) return;
            setError(e?.message ?? "Failed to load stopframe filters");
        } finally {
            if (!mountedRef.current) return;
            setLoading(false);
        }
    }, []);

    // ✅ FAZA 4D: resolve previews for missing cache entries
    const resolvePreviewForPath = useCallback(async (absolutePath: string) => {
        const path = absolutePath.trim();
        if (!path) return;

        const cache = previewCacheRef.current;
        if (cache.has(path)) return; // already resolved (string or null)

        // optimistic placeholder to prevent duplicate concurrent calls
        cache.set(path, null);
        setPreviewVersion((v) => v + 1);

        try {
            const dataUrl = await window.api.stopFrames.openPreview(path);
            cache.set(path, dataUrl);
            setPreviewVersion((v) => v + 1);
        } catch {
            // treat as invalid preview
            cache.set(path, null);
            setPreviewVersion((v) => v + 1);
        }
    }, []);

    // Initial mount + subscriptions
    useEffect(() => {
        mountedRef.current = true;

        reload();

        const unsubChanged = window.api.stopFrames.onChanged((next) => {
            // accept Electron truth
            setFiltersRaw(next || []);
            setBlockingMessage(null);
        });

        const unsubNotif = window.api.stopFrames.onNotification((n) => {
            if (!n) return;
            setNotifications((prev) => [n, ...prev].slice(0, 20));
            // UI can show warnings; preview cache remains read-only
        });

        return () => {
            mountedRef.current = false;
            unsubChanged();
            unsubNotif();
        };
    }, [reload]);

    // ✅ FAZA 4D: when filters list changes, invalidate cache for old paths and load previews for new ones
    useEffect(() => {
        const prev = prevPathByIdRef.current;
        const cache = previewCacheRef.current;

        // build next map
        const nextMap = new Map<string, string>();
        for (const f of filtersRaw) {
            const path = (f.stopFramePath || "").trim();
            if (path) nextMap.set(f.id, path);
        }

        // invalidate old paths when changed or removed
        for (const [id, oldPath] of prev.entries()) {
            const newPath = nextMap.get(id);
            if (!newPath || newPath !== oldPath) {
                cache.delete(oldPath);
            }
        }

        // store next
        prevPathByIdRef.current = nextMap;

        // request previews for current paths (cache-miss only)
        for (const path of nextMap.values()) {
            void resolvePreviewForPath(path);
        }

        // bump once after invalidations so UI drops stale previews immediately
        setPreviewVersion((v) => v + 1);
    }, [filtersRaw, resolvePreviewForPath]);

    const createFilter = useCallback(
        async (input: CreateFilterInput) => {
            const candidate: StopFrameFilter = {
                id: "__new__",
                name: input.name,
                enabled: input.enabled,
                shows: normalizeShows(input.shows),
                stopFramePath: input.stopFramePath,
            };

            const nextFilters = [...filtersRaw, candidate];
            const { blocked, message } = wouldIntroduceConflicts(nextFilters);
            if (blocked) {
                setBlockingMessage(message);
                return;
            }

            setBlockingMessage(null);
            try {
                const updated = await window.api.stopFrames.createFilter({
                    name: input.name,
                    enabled: input.enabled,
                    shows: normalizeShows(input.shows),
                    stopFramePath: input.stopFramePath,
                });
                if (!mountedRef.current) return;
                setFiltersRaw(updated || []);
            } catch (e: any) {
                if (!mountedRef.current) return;
                setError(e?.message ?? "Failed to create filter");
            }
        },
        [filtersRaw]
    );

    const updateFilter = useCallback(
        async (id: string, patch: UpdateFilterPatch) => {
            const nextFilters = filtersRaw.map((f) => {
                if (f.id !== id) return f;
                const next: StopFrameFilter = { ...f, ...patch };
                if (patch.shows) next.shows = normalizeShows(patch.shows);
                if (patch.stopFramePath !== undefined) next.stopFramePath = patch.stopFramePath;
                return next;
            });

            const { blocked, message } = wouldIntroduceConflicts(nextFilters);
            if (blocked) {
                setBlockingMessage(message);
                return;
            }

            setBlockingMessage(null);
            try {
                const updated = await window.api.stopFrames.updateFilter(id, patch);
                if (!mountedRef.current) return;
                setFiltersRaw(updated || []);
            } catch (e: any) {
                if (!mountedRef.current) return;
                setError(e?.message ?? "Failed to update filter");
            }
        },
        [filtersRaw]
    );

    const deleteFilter = useCallback(async (id: string) => {
        setBlockingMessage(null);
        try {
            const updated = await window.api.stopFrames.deleteFilter(id);
            if (!mountedRef.current) return;
            setFiltersRaw(updated || []);
        } catch (e: any) {
            if (!mountedRef.current) return;
            setError(e?.message ?? "Failed to delete filter");
        }
    }, []);

    const toggleEnabled = useCallback(
        async (id: string) => {
            const target = filtersRaw.find((f) => f.id === id);
            if (!target) return;

            const nextFilters = filtersRaw.map((f) =>
                f.id === id ? { ...f, enabled: !f.enabled } : f
            );

            const { blocked, message } = wouldIntroduceConflicts(nextFilters);
            if (blocked) {
                setBlockingMessage(message);
                return;
            }

            setBlockingMessage(null);
            try {
                const updated = await window.api.stopFrames.updateFilter(id, { enabled: !target.enabled });
                if (!mountedRef.current) return;
                setFiltersRaw(updated || []);
            } catch (e: any) {
                if (!mountedRef.current) return;
                setError(e?.message ?? "Failed to toggle filter");
            }
        },
        [filtersRaw]
    );

    // ✅ FAZA 4D: select image (optional IPC) — UI gets a path only
    const selectStopFrameImage = useCallback(async (): Promise<string | null> => {
        try {
            // Some setups may not have selectImage; stay safe.
            const fn = (window.api.stopFrames as any)?.selectImage as (() => Promise<string | null>) | undefined;
            if (!fn) return null;
            const path = await fn();
            return path ?? null;
        } catch {
            return null;
        }
    }, []);

    return {
        filters,
        loading,
        error,

        notifications,

        showOptions,

        conflicts,
        hasBlockingConflicts,
        blockingMessage,

        reload,
        createFilter,
        updateFilter,
        deleteFilter,
        toggleEnabled,

        selectStopFrameImage,
    };
}
