import TextInput from "./ui/TextInput";
import SelectInput from "./ui/SelectInput";
import { Button } from "./ui/Button";
import { useSchedule } from "../context/ScheduleContext";

export default function ScheduleList() {
  const {
    items,
    loading,
    addItem,
    updateItem,
    removeItem,
    saveAll,
    syncSchedule,
  } = useSchedule();

  if (loading) return <div>Loading schedule...</div>;

  return (
    <div className="mt-8 bg-gray-900 p-4 rounded border border-gray-700 text-gray-100">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold flex items-center justify-center flex-row">
          📅 Schedule
        </h2>

        <div className="flex gap-2 items-center">
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

          <button
            onClick={syncSchedule}
            className="px-3 py-1 rounded font-semibold bg-yellow-600 hover:bg-yellow-700 text-white"
            title="Load today's schedule"
          >
            Update Schedule
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
            {items.map(i => {
              const now = new Date();
              const start = new Date(i.startTime);
              const end = new Date(start.getTime() + i.durationMinutes * 60000);

              let rowColor = "bg-gray-900";
              if (now > end) rowColor = "bg-gray-800 opacity-70";
              else if (now >= start && now <= end) rowColor = "bg-green-900/40";
              else if (now < start) rowColor = "bg-yellow-900/30";

              return (
                <tr
                  key={i.id}
                  className={`${rowColor} border-t border-gray-700 transition-colors duration-300`}
                >
                  <td className="p-1">
                    <TextInput
                      label="Stream name"
                      value={i.name}
                      onChange={e => updateItem(i.id, "name", e.target.value)}
                    />
                  </td>

                  <td className="p-1">
                    <SelectInput
                      label="Platform"
                      value={i.platform}
                      onChange={e =>
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
                      onChange={e =>
                        updateItem(i.id, "startTime", e.target.value)
                      }
                    />
                  </td>

                  <td className="p-1">
                    <TextInput
                      label="Duration (minutes)"
                      type="number"
                      value={i.durationMinutes}
                      onChange={e =>
                        updateItem(i.id, "durationMinutes", Number(e.target.value))
                      }
                    />
                  </td>

                  <td className="p-1">
                    <TextInput
                      label="Facebook key"
                      value={i.fbKey || ""}
                      onChange={e => updateItem(i.id, "fbKey", e.target.value)}
                    />
                  </td>

                  <td className="p-1 text-center">
                    <input
                      type="checkbox"
                      checked={i.autoStart !== false}
                      onChange={e =>
                        updateItem(i.id, "autoStart", e.target.checked)
                      }
                    />
                  </td>

                  <td className="p-1 text-center">
                    <Button
                      onClick={() => removeItem(i.id)}
                      className="bg-red-600 rounded hover:bg-red-700"
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
