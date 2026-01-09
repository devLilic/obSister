// File: src/context/ScheduleContext.tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ScheduleItem, ScheduleItemStatus } from "../../electron/types/types";
import { v4 as uuidv4 } from "uuid";
import { getSchedule, saveSchedule, setScheduleItemStatus } from "../services/scheduleService";
import { syncGoogleSchedule } from "../services/googleService";

interface ScheduleContextState {
  items: ScheduleItem[];
  loading: boolean;
  error: string | null;

  addItem: () => void;
  updateItem: (id: string, field: keyof ScheduleItem, value: any) => void;
  removeItem: (id: string) => void;

  saveAll: () => Promise<void>;
  syncSchedule: () => Promise<void>;

  setItemStatus: (id: string, status: ScheduleItemStatus) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextState | null>(null);

export const ScheduleProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------
  // LOAD schedule
  // ----------------------------------------
  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSchedule();
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ----------------------------------------
  // ADD ITEM
  // ----------------------------------------
  const addItem = () => {
    const now = new Date().toISOString().slice(0, 16);

    const newItem: ScheduleItem = {
      id: uuidv4(),
      name: "",
      platform: "multi",
      startTime: now,
      durationMinutes: 52,
      fbKey: "",
      autoStart: true,
      status: "upcoming",
    };

    setItems((prev) => [...prev, newItem]);
  };

  // ----------------------------------------
  // UPDATE ITEM
  // ----------------------------------------
  const updateItem = (id: string, field: keyof ScheduleItem, value: any) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  // ----------------------------------------
  // REMOVE ITEM
  // ----------------------------------------
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // ----------------------------------------
  // SAVE ALL
  // ----------------------------------------
  const saveAll = async () => {
    try {
      await saveSchedule(items);
      await loadSchedule();
      // ✅ Behavior unchanged
      alert("Schedule saved!");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ----------------------------------------
  // SYNC GOOGLE SCHEDULE
  // ----------------------------------------
  const syncSchedule = async () => {
    try {
      const result = await syncGoogleSchedule();
      // ✅ Behavior unchanged
      console.log("SYNC RESULT:", result);

      await loadSchedule(); // reload instantly
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ----------------------------------------
  // SET STATUS manually (terminated)
  // ----------------------------------------
  const setItemStatus = async (id: string, status: ScheduleItemStatus) => {
    try {
      await setScheduleItemStatus(id, status);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
      <ScheduleContext.Provider
          value={{
            items,
            loading,
            error,
            addItem,
            updateItem,
            removeItem,
            saveAll,
            syncSchedule,
            setItemStatus,
          }}
      >
        {children}
      </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule must be inside ScheduleProvider");
  return ctx;
};
