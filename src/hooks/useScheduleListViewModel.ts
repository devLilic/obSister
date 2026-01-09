// File: src/hooks/useScheduleListViewModel.ts
import { useMemo, useCallback } from "react";
import { useSchedule } from "../context/ScheduleContext";
import { useAutoStopRuntime } from "../context/AutoStopRuntimeContext";
import type { ScheduleItem } from "../../electron/types/types";

export type ScheduleListRowVM = {
    id: string;
    item: ScheduleItem;

    // UI styling (behavior unchanged)
    rowColorClass: string;

    // FAZA 5: UI helper (highlight currently scanned item)
    isAutoStopActiveItem: boolean;

    // Stable handlers for UI
    onChangeName: (value: string) => void;
    onChangePlatform: (value: ScheduleItem["platform"]) => void;
    onChangeStartTime: (value: string) => void;
    onChangeDurationMinutes: (value: number) => void;
    onChangeFbKey: (value: string) => void;
    onChangeAutoStart: (value: boolean) => void;

    onRemove: () => void;
};

export type ScheduleListViewModel = {
    loading: boolean;
    itemsCount: number;
    rows: ScheduleListRowVM[];

    onAdd: () => void;
    onSave: () => Promise<void>;
    onSync: () => Promise<void>;

    // FAZA 5: AutoStop runtime display props (UI-ready)
    autoStopScanStatusLabel: string;
    autoStopScanVariant: "info" | "success" | "warning" | "error";
};

function computeRowColorClass(item: ScheduleItem): string {
    // ⚠️ Behavior unchanged: identical logic moved from component
    const now = new Date();
    const start = new Date(item.startTime);
    const end = new Date(start.getTime() + item.durationMinutes * 60000);

    let rowColor = "bg-gray-900";
    if (now > end) rowColor = "bg-gray-800 opacity-70";
    else if (now >= start && now <= end) rowColor = "bg-green-900/40";
    else if (now < start) rowColor = "bg-yellow-900/30";

    return rowColor;
}

export function useScheduleListViewModel(): ScheduleListViewModel {
    const { items, loading, addItem, updateItem, removeItem, saveAll, syncSchedule } = useSchedule();
    const autoStop = useAutoStopRuntime();

    // Keep top-level actions stable
    const onAdd = useCallback(() => addItem(), [addItem]);
    const onSave = useCallback(() => saveAll(), [saveAll]);
    const onSync = useCallback(() => syncSchedule(), [syncSchedule]);

    const rows = useMemo<ScheduleListRowVM[]>(() => {
        const activeScanItemId = autoStop.isScanning ? autoStop.activeItemId : null;

        return items.map((i) => ({
            id: i.id,
            item: i,

            rowColorClass: computeRowColorClass(i),

            // FAZA 5 highlight (passive, Electron truth via AutoStopRuntimeProvider)
            isAutoStopActiveItem: Boolean(activeScanItemId && i.id === activeScanItemId),

            onChangeName: (value: string) => updateItem(i.id, "name", value),
            onChangePlatform: (value: ScheduleItem["platform"]) => updateItem(i.id, "platform", value),
            onChangeStartTime: (value: string) => updateItem(i.id, "startTime", value),
            onChangeDurationMinutes: (value: number) => updateItem(i.id, "durationMinutes", value),
            onChangeFbKey: (value: string) => updateItem(i.id, "fbKey", value),
            onChangeAutoStart: (value: boolean) => updateItem(i.id, "autoStart", value),

            onRemove: () => removeItem(i.id),
        }));
    }, [items, updateItem, removeItem, autoStop.isScanning, autoStop.activeItemId]);

    return {
        loading,
        itemsCount: items.length,
        rows,

        onAdd,
        onSave,
        onSync,

        // FAZA 5: UI-ready labels/variants (no mapping in UI)
        autoStopScanStatusLabel: autoStop.autoStopScanStatusLabel,
        autoStopScanVariant: autoStop.autoStopScanVariant,
    };
}
