import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import TextInput from "./ui/TextInput";
import SelectInput from "./ui/SelectInput";
import { Button } from "./ui/Button";
import { ScheduleItem } from "../../electron/main/schedule/types";
import SchedulerStatusBadge from "./SchedulerStatusBadge";

export default function ScheduleList() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await window.api.schedule.get();
      setItems(data);
      setLoading(false);
    })();
  }, []);

  const addItem = () => {
    const now = new Date().toISOString().slice(0, 16);
    setItems([
      ...items,
      {
        id: uuidv4(),
        name: "New Stream",
        platform: "facebook",
        startTime: now,
        durationMinutes: 30,
        fbKey: "",
      },
    ]);
  };

  const updateItem = (id: string, field: keyof ScheduleItem, value: any) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const saveAll = async () => {
    await window.api.schedule.save(items);
    alert("Schedule saved!");
  };

  if (loading) return <div>Loading schedule...</div>;

  return (
    <div className="mt-8 bg-gray-900 p-4 rounded border border-gray-700 text-gray-100">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold flex items-center justify-center flex-row">📅 Schedule | <SchedulerStatusBadge/></h2>
        <div className="flex gap-2">
          <button
            onClick={addItem}
            className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
          >
            + Add
          </button>
          <button
            onClick={saveAll}
            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>

      

      {items.length === 0 ? (
        <div className="text-gray-400">No scheduled streams yet.</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-2">Name</th>
              <th className="p-2">Platform</th>
              <th className="p-2">Start</th>
              <th className="p-2">Duration (min)</th>
              <th className="p-2">FB Key</th>
              <th className="p-2">Auto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const now = new Date();
              const start = new Date(i.startTime);
              const end = new Date(start.getTime() + i.durationMinutes * 60000);

              let rowColor = "bg-gray-900";
              if (now > end) rowColor = "bg-gray-800 opacity-70"; // past
              else if (now >= start && now <= end) rowColor = "bg-green-900/40"; // live
              else if (now < start) rowColor = "bg-yellow-900/30"; // upcoming
              return (
                (
                  <tr key={i.id} className={`${rowColor} border-t border-gray-700 transition-colors duration-300`}>
                    <td className="p-1">
                        <TextInput
                            label="Stream name"
                            value={i.name}
                            onChange={(e) => updateItem(i.id, "name", e.target.value)} />
                    </td>
                    <td className="p-1">
                        <SelectInput
                            label="Platform"
                            value={i.platform}
                            onChange={(e) =>
                                updateItem(i.id, "platform", e.target.value as any)
                            }
                        >
                            <option value="multi">Multi</option>
                            <option value="facebook">Facebook</option>
                            <option value="youtube">YouTube</option>
                        </SelectInput>
                      
                    </td>
                    <td className="p-1">
                        <TextInput
                            label="Start time"
                            type="datetime-local"
                            value={i.startTime.slice(0, 16)}
                            onChange={(e) => updateItem(i.id, "startTime", e.target.value)}
                        />
                    </td>
                    <td className="p-1">
                        <TextInput
                            label="Duration (minutes)"
                            type="number"
                            value={i.durationMinutes}
                            onChange={(e) =>
                            updateItem(i.id, "durationMinutes", Number(e.target.value))
                            }
                        />
                    </td>
                    <td className="p-1">
                        <TextInput
                            label="Facebook key"
                            value={i.fbKey || ""}
                            onChange={(e) => updateItem(i.id, "fbKey", e.target.value)}
                        />
                    </td>
                    <td className="p-1 text-center justify-center flex-row">
                      <input
                        type="checkbox"
                        aria-label="Auto-start enabled"
                        checked={i.autoStart !== false}
                        onChange={(e) =>
                          updateItem(i.id, "autoStart", e.target.checked)
                        }
                      />
                    </td>
                    <td className="p-1 text-center">
                        <Button
                            onClick={() => removeItem(i.id)}
                            className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                        >
                            ✕
                        </Button>
                    </td>
                  </tr>
                )
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
