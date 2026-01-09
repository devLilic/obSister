// filepath: src/components/ScheduleList.tsx
import TextInput from "./ui/TextInput";
import SelectInput from "./ui/SelectInput";
import { Button } from "./ui/Button";
import { useScheduleListViewModel } from "../hooks/useScheduleListViewModel";
import {useStopFramePreviewLookup} from "../hooks/useStopFramePreviewLookup.ts";

type Variant = "info" | "success" | "warning" | "error";

function badgeTone(variant: Variant) {
  switch (variant) {
    case "success":
      return "border-green-700 bg-green-900/20 text-green-200";
    case "warning":
      return "border-yellow-700 bg-yellow-900/20 text-yellow-200";
    case "error":
      return "border-red-700 bg-red-900/20 text-red-200";
    default:
      return "border-blue-700 bg-blue-900/20 text-blue-200";
  }
}

function dotTone(variant: Variant) {
  switch (variant) {
    case "success":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-blue-500";
  }
}

function MiniBadge({ label, variant, title }: { label: string; variant: Variant; title?: string }) {
  return (
      <span
          title={title ?? label}
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] ${badgeTone(variant)}`}
      >
      <span className={`inline-block w-2 h-2 rounded-full ${dotTone(variant)}`} />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

export default function ScheduleList() {
  // VM existent + props noi pentru AutoStop runtime (fără logică în UI)
  const vm: any = useScheduleListViewModel();
  const { getPreviewForPath } = useStopFramePreviewLookup();

  const loading: boolean = vm.loading;
  const itemsCount: number = vm.itemsCount ?? vm.rows?.length ?? 0;
  const rows: any[] = vm.rows ?? [];
  const onAdd = vm.onAdd;
  const onSave = vm.onSave;
  const onSync = vm.onSync;

  // NOU: status global AutoStop (din props VM)
  const autoStopScanStatusLabel: string | undefined = vm.autoStopScanStatusLabel;
  const autoStopScanVariant: Variant | undefined = vm.autoStopScanVariant;

  if (loading) return <div>Loading schedule...</div>;

  return (
      <div className="mt-8 bg-gray-900 p-4 rounded border border-gray-700 text-gray-100 w-full max-w-5xl">
        <div className="flex justify-between items-center mb-3 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold flex items-center justify-center flex-row">📅 Schedule</h2>

            {/* NOU: status global AutoStop (doar render) */}
            {autoStopScanStatusLabel && autoStopScanVariant ? (
                <MiniBadge label={autoStopScanStatusLabel} variant={autoStopScanVariant} title={autoStopScanStatusLabel} />
            ) : null}
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={onAdd} className="bg-green-600 px-3 py-1 rounded hover:bg-green-700">
              + Add
            </button>

            <button onClick={() => void onSave()} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700">
              Save
            </button>

            <button
                onClick={() => void onSync()}
                className="px-3 py-1 rounded font-semibold bg-yellow-600 hover:bg-yellow-700 text-white"
                title="Load today's schedule"
            >
              Update Schedule
            </button>
          </div>
        </div>

        {itemsCount === 0 ? (
            <div className="text-gray-400">No scheduled streams yet.</div>
        ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
              <tr className="bg-gray-800">
                {/* NEW: StopFrame preview (UI only) */}
                <th className="p-2">StopFrame</th>
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
              {rows.map((row) => {
                const i = row.item ?? row; // compat: editor rows (row.item) sau rows simplificate (row)
                const preview = getPreviewForPath(i.stopFramePath);

                // NOU: item activ scanat (din VM) -> doar highlight/badge
                const isAutoStopActiveItem: boolean = Boolean(row.isAutoStopActiveItem ?? i.isAutoStopActiveItem);

                // Badge mic lângă itemul activ + tooltip cu mesajul complet (din props globale)
                const activeBadge =
                    isAutoStopActiveItem && autoStopScanStatusLabel && autoStopScanVariant ? (
                        <MiniBadge
                            label={autoStopScanStatusLabel}
                            variant={autoStopScanVariant}
                            title={autoStopScanStatusLabel}
                        />
                    ) : null;

                return (
                    <tr
                        key={row.id}
                        className={`${row.rowColorClass ?? ""} border-t border-gray-700 transition-colors duration-300 ${
                            isAutoStopActiveItem ? "outline outline-1 outline-blue-800/60" : ""
                        }`}
                    >
                      {/* NEW: StopFrame preview cell */}
                      <td className="p-1">
                        <div
                            className="flex items-center justify-center"
                            title={i.stopFramePath ? String(i.stopFramePath) : ""}
                        >
                          {preview ? (
                              <img src={preview} alt="StopFrame preview" className="h-10 w-auto rounded" />
                          ) : preview === null ? (
                              <span className="text-xs text-red-400">Invalid stopframe</span>
                          ) : (
                              <span className="text-xs text-gray-500">No preview</span>
                          )}
                        </div>
                      </td>
                      <td className="p-1">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <TextInput
                                label="Stream name"
                                value={i.name}
                                onChange={(e) => row.onChangeName?.(e.target.value)}
                            />
                          </div>

                          {/* NOU: badge mic pentru item activ scanat */}
                          {activeBadge}
                        </div>
                      </td>

                      <td className="p-1">
                        <SelectInput
                            label="Platform"
                            value={i.platform}
                            onChange={(e) => row.onChangePlatform?.(e.target.value as any)}
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
                            value={String(i.startTime).slice(0, 16)}
                            onChange={(e) => row.onChangeStartTime?.(e.target.value)}
                        />
                      </td>

                      <td className="p-1">
                        <TextInput
                            label="Duration (minutes)"
                            type="number"
                            value={i.durationMinutes}
                            onChange={(e) => row.onChangeDurationMinutes?.(Number(e.target.value))}
                        />
                      </td>

                      <td className="p-1">
                        <TextInput
                            label="Facebook key"
                            value={i.fbKey || ""}
                            onChange={(e) => row.onChangeFbKey?.(e.target.value)}
                        />
                      </td>

                      <td className="p-1 text-center">
                        <input
                            type="checkbox"
                            checked={i.autoStart !== false}
                            onChange={(e) => row.onChangeAutoStart?.(e.target.checked)}
                        />
                      </td>

                      <td className="p-1 text-center">
                        <Button onClick={row.onRemove} className="bg-red-600 rounded hover:bg-red-700">
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
