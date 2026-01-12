// filepath: src/components/stopframe/StopFrameFiltersSection.tsx
import { useMemo, useState } from "react";
import { useStopFrameFiltersViewModel } from "../../hooks/useStopFrameFiltersViewModel";

type Draft = {
    name: string;
    enabled: boolean;
    showsText: string; // newline-separated
    stopFramePath: string;
};

function truncateMiddle(input: string, max = 44) {
    if (!input) return "";
    if (input.length <= max) return input;
    const left = Math.max(10, Math.floor((max - 3) / 2));
    const right = Math.max(10, max - 3 - left);
    return `${input.slice(0, left)}…${input.slice(input.length - right)}`;
}

function toShowsArray(showsText: string): string[] {
    // newline-separated only (no delimiter)
    const lines = (showsText ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    // unique, keep order
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of lines) {
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

function fromShowsArray(shows: string[]): string {
    return (shows ?? []).join("\n");
}

export default function StopFrameFiltersSection() {
    const vm = useStopFrameFiltersViewModel();

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftById, setDraftById] = useState<Record<string, Draft>>({});

    // Create state
    const [creating, setCreating] = useState(false);
    const [createDraft, setCreateDraft] = useState<Draft>({
        name: "",
        enabled: true,
        showsText: "",
        stopFramePath: "",
    });

    const canMutate = !vm.hasBlockingConflicts;

    const conflictsText = useMemo(() => {
        if (!vm.hasBlockingConflicts) return null;
        return vm.blockingMessage ?? "Blocking conflicts detected. Please fix conflicts to continue.";
    }, [vm.hasBlockingConflicts, vm.blockingMessage]);

    const startEdit = (id: string) => {
        const f = vm.filters.find((x) => x.id === id);
        if (!f) return;

        setDraftById((prev) => ({
            ...prev,
            [id]: {
                name: f.name ?? "",
                enabled: Boolean(f.enabled),
                showsText: fromShowsArray(f.shows ?? []),
                stopFramePath: f.stopFramePath ?? "",
            },
        }));
        setEditingId(id);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: string) => {
        const draft = draftById[id];
        if (!draft) return;

        const patch = {
            name: draft.name.trim(),
            enabled: Boolean(draft.enabled),
            shows: toShowsArray(draft.showsText),
            stopFramePath: draft.stopFramePath.trim(),
        };

        await vm.updateFilter(id, patch);
        setEditingId(null);
    };

    const selectImageIntoDraft = async (scope: "create" | "edit", id?: string) => {
        const path = await vm.selectStopFrameImage();
        if (!path) return;

        if (scope === "create") {
            setCreateDraft((prev) => ({ ...prev, stopFramePath: path }));
            return;
        }

        if (!id) return;
        setDraftById((prev) => ({
            ...prev,
            [id]: {
                ...(prev[id] ?? { name: "", enabled: true, showsText: "", stopFramePath: "" }),
                stopFramePath: path,
            },
        }));
    };

    const createFilter = async () => {
        const input = {
            name: createDraft.name.trim(),
            enabled: Boolean(createDraft.enabled),
            shows: toShowsArray(createDraft.showsText),
            stopFramePath: createDraft.stopFramePath.trim(),
        };

        await vm.createFilter(input);
        setCreating(false);
        setCreateDraft({ name: "", enabled: true, showsText: "", stopFramePath: "" });
    };

    if (vm.loading) {
        return (
            <div className="bg-gray-900 text-gray-100 p-4 rounded border border-gray-700 w-full space-y-3">
                <div className="text-gray-300 font-semibold">🧩 StopFrame Filters</div>
                <div className="text-gray-400 text-sm">Loading…</div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-gray-100 p-4 rounded border border-gray-700 w-full max-h-[500px] space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-gray-200 font-semibold">StopFrame Filtre</div>

                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void vm.reload()}
                        className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
                        title="Reload filters"
                    >
                        Reload
                    </button>

                    <button
                        onClick={() => {
                            setCreating((v) => !v);
                            if (!creating) setEditingId(null);
                        }}
                        disabled={!canMutate}
                        className={`px-3 py-1.5 rounded text-sm border ${
                            !canMutate
                                ? "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                        }`}
                        title={!canMutate ? "Blocked by conflicts" : "Create new filter"}
                    >
                        + Add filter
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {vm.error ? (
                <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-red-200 text-sm">
                    {vm.error}
                </div>
            ) : null}

            {/* Blocking banner */}
            {conflictsText ? (
                <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-red-200 text-sm space-y-2">
                    <div className="font-semibold">Conflict detected</div>
                    <div>{conflictsText}</div>

                    {/* Optional details */}
                    {vm.conflicts?.length ? (
                        <div className="text-xs text-red-200/90">
                            {vm.conflicts.map((c: any, idx: number) => (
                                <div key={idx} className="mt-1">
                                    <span className="font-mono">{c.show}</span> →{" "}
                                    <span className="font-semibold">{(c.filterNames ?? []).join(", ")}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {/* Notifications */}
            {vm.notifications?.length ? (
                <div className="rounded border border-yellow-700 bg-yellow-900/20 px-3 py-2 text-yellow-200 text-sm space-y-1">
                    <div className="font-semibold">Notifications</div>
                    <ul className="list-disc pl-5 space-y-1">
                        {vm.notifications.map((n: any, idx: number) => (
                            <li key={idx}>
                                <span className="font-mono">{n.type}</span>
                                {n.message ? <span className="ml-2 text-yellow-100">{n.message}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Create editor */}
            {creating ? (
                <div className="rounded border border-gray-700 bg-gray-950 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-200">Create filter</div>
                        <button
                            onClick={() => setCreating(false)}
                            className="text-sm text-gray-400 hover:text-gray-200"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block">
                            <div className="text-xs text-gray-400 mb-1">Name</div>
                            <input
                                value={createDraft.name}
                                onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                                placeholder="e.g. News — FB"
                            />
                        </label>

                        <label className="flex items-center gap-2 mt-5 md:mt-0">
                            <input
                                type="checkbox"
                                checked={createDraft.enabled}
                                onChange={(e) => setCreateDraft((p) => ({ ...p, enabled: e.target.checked }))}
                                className="w-4 h-4"
                                disabled={!canMutate}
                            />
                            <span className="text-sm text-gray-200">Enabled</span>
                        </label>

                        <label className="block md:col-span-2">
                            <div className="text-xs text-gray-400 mb-1">Shows (one per line)</div>
                            <textarea
                                value={createDraft.showsText}
                                onChange={(e) => setCreateDraft((p) => ({ ...p, showsText: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100 h-24 font-mono text-xs"
                                placeholder={"Show 1\nShow 2\nShow 3"}
                            />
                        </label>

                        <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-gray-400">StopFrame image</div>
                                <button
                                    onClick={() => void selectImageIntoDraft("create")}
                                    disabled={!canMutate}
                                    className={`px-3 py-1.5 rounded text-sm border ${
                                        !canMutate
                                            ? "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed"
                                            : "bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700"
                                    }`}
                                >
                                    Select image…
                                </button>
                            </div>

                            <input
                                value={createDraft.stopFramePath}
                                onChange={(e) => setCreateDraft((p) => ({ ...p, stopFramePath: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100 font-mono text-xs"
                                placeholder="Full path to image (auto-filled by Select image)"
                                disabled={!canMutate}
                            />

                            <div className="rounded border border-gray-700 bg-gray-900 p-2 flex items-center justify-center min-h-24">
                                {/* Create preview is not guaranteed here unless VM returns a preview for draft.
                    We keep it UI-dumb: just a placeholder. */}
                                <div className="text-xs text-gray-500">Preview will appear after saving (or when VM provides preview for drafts).</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            onClick={() => setCreating(false)}
                            className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => void createFilter()}
                            disabled={!canMutate || !createDraft.name.trim()}
                            className={`px-3 py-1.5 rounded text-sm border ${
                                !canMutate || !createDraft.name.trim()
                                    ? "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                            }`}
                            title={!canMutate ? "Blocked by conflicts" : ""}
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Filters list */}
            <div className="space-y-3">
                {vm.filters.length === 0 ? (
                    <div className="text-sm text-gray-500">No filters yet.</div>
                ) : (
                    vm.filters.map((f: any) => {
                        const isEditing = editingId === f.id;
                        const draft = draftById[f.id];

                        const showsCount = (f.shows ?? []).length;
                        const previewUrl: string | null = f.stopFramePreviewUrl ?? null;

                        return (
                            <div key={f.id} className="rounded border border-gray-700 bg-gray-950 p-3 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-gray-200 font-semibold truncate" title={f.name}>
                                            {f.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {f.enabled ? "Enabled" : "Disabled"} • {showsCount} show(s)
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isEditing ? (
                                            <>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(f.enabled)}
                                                        onChange={() => void vm.toggleEnabled(f.id)}
                                                        disabled={!canMutate}
                                                        className="w-4 h-4"
                                                        title={!canMutate ? "Blocked by conflicts" : "Toggle enabled"}
                                                    />
                                                    <span className="text-gray-300">Enabled</span>
                                                </label>

                                                <button
                                                    onClick={() => startEdit(f.id)}
                                                    className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => void vm.deleteFilter(f.id)}
                                                    disabled={!canMutate}
                                                    className={`px-3 py-1.5 rounded text-sm border ${
                                                        !canMutate
                                                            ? "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed"
                                                            : "bg-red-600 hover:bg-red-700 text-white border-red-700"
                                                    }`}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => cancelEdit()}
                                                    className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => void saveEdit(f.id)}
                                                    disabled={!canMutate}
                                                    className={`px-3 py-1.5 rounded text-sm border ${
                                                        !canMutate
                                                            ? "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed"
                                                            : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                                                    }`}
                                                    title={!canMutate ? "Blocked by conflicts" : ""}
                                                >
                                                    Save
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                {!isEditing ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <div className="text-xs text-gray-400">StopFrame path</div>
                                            <div
                                                className="text-xs font-mono text-gray-300 bg-gray-900 border border-gray-800 rounded px-2 py-1"
                                                title={f.stopFramePath ?? ""}
                                            >
                                                {f.stopFramePath ? truncateMiddle(f.stopFramePath, 36) : "—"}
                                            </div>

                                            <div className="text-xs text-gray-500">
                                                Shows:{" "}
                                                <span className="text-gray-400">
                          {showsCount ? truncateMiddle((f.shows ?? []).join(", "), 60) : "—"}
                        </span>
                                            </div>
                                        </div>

                                        <div className="rounded border border-gray-700 bg-gray-900 p-2 flex items-center justify-center min-h-24">
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="StopFrame preview"
                                                    className="max-h-24 w-auto rounded border border-gray-700"
                                                />
                                            ) : (
                                                <div className="text-xs text-gray-500">No preview</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <label className="block">
                                            <div className="text-xs text-gray-400 mb-1">Name</div>
                                            <input
                                                value={draft?.name ?? ""}
                                                onChange={(e) =>
                                                    setDraftById((prev) => ({
                                                        ...prev,
                                                        [f.id]: { ...(prev[f.id] ?? draft), name: e.target.value },
                                                    }))
                                                }
                                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                                                disabled={!canMutate}
                                            />
                                        </label>

                                        <label className="flex items-center gap-2 mt-5 md:mt-0">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(draft?.enabled)}
                                                onChange={(e) =>
                                                    setDraftById((prev) => ({
                                                        ...prev,
                                                        [f.id]: { ...(prev[f.id] ?? draft), enabled: e.target.checked },
                                                    }))
                                                }
                                                className="w-4 h-4"
                                                disabled={!canMutate}
                                            />
                                            <span className="text-sm text-gray-200">Enabled</span>
                                        </label>

                                        <label className="block md:col-span-2">
                                            <div className="text-xs text-gray-400 mb-1">Shows (one per line)</div>
                                            <textarea
                                                value={draft?.showsText ?? ""}
                                                onChange={(e) =>
                                                    setDraftById((prev) => ({
                                                        ...prev,
                                                        [f.id]: { ...(prev[f.id] ?? draft), showsText: e.target.value },
                                                    }))
                                                }
                                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100 h-24 font-mono text-xs"
                                                disabled={!canMutate}
                                            />
                                        </label>

                                        <div className="md:col-span-2 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-xs text-gray-400">StopFrame image</div>
                                                <button
                                                    onClick={() => void selectImageIntoDraft("edit", f.id)}
                                                    disabled={!canMutate}
                                                    className={`px-3 py-1.5 rounded text-sm border ${
                                                        !canMutate
                                                            ? "bg-gray-800 text-gray-500 border-gray-800 cursor-not-allowed"
                                                            : "bg-gray-800 hover:bg-gray-700 text-gray-100 border-gray-700"
                                                    }`}
                                                >
                                                    Select image…
                                                </button>
                                            </div>

                                            <input
                                                value={draft?.stopFramePath ?? ""}
                                                onChange={(e) =>
                                                    setDraftById((prev) => ({
                                                        ...prev,
                                                        [f.id]: { ...(prev[f.id] ?? draft), stopFramePath: e.target.value },
                                                    }))
                                                }
                                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100 font-mono text-xs"
                                                disabled={!canMutate}
                                            />

                                            <div className="rounded border border-gray-700 bg-gray-900 p-2 flex items-center justify-center min-h-24">
                                                {previewUrl ? (
                                                    <img
                                                        src={previewUrl}
                                                        alt="StopFrame preview"
                                                        className="max-h-24 w-auto rounded border border-gray-700"
                                                    />
                                                ) : (
                                                    <div className="text-xs text-gray-500">No preview</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
