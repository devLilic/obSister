// filepath: src/pages/SettingsPage.tsx
import { useState } from "react";
import { useSettingsPageViewModel } from "../features/settings/useSettingsPageViewModel";
import StopFrameFiltersSection from "../components/stopframe/StopFrameFiltersSection";

type TabId = "obs" | "google" | "autostop" | "filters";

export default function SettingsPage() {
  const {
    config,
    loading,
    saved,
    showPassword,
    testing,
    testResult,
    syncing,
    syncMessage,
    syncSchedule,
    testConnection,
    update,
    updateGoogle,
    updateAutoStop,
    toggleShowPassword,
    save,
  } = useSettingsPageViewModel();

  const [activeTab, setActiveTab] = useState<TabId>("obs");

  if (loading) return <div className="text-gray-400">Loading configuration...</div>;

  const tabs: { id: TabId; label: string }[] = [
    { id: "obs", label: "OBS WebSocket" },
    { id: "google", label: "Google Sheets" },
    { id: "autostop", label: "Autostop" },
    { id: "filters", label: "StopFrame Filters" },
  ];

  return (
      <div className="bg-gray-900 text-gray-100 p-6 rounded border border-gray-700 max-w-2xl w-full flex flex-col max-h-[90vh]">
        <h2 className="text-xl font-semibold text-blue-400 mb-4 shrink-0">⚙️ Settings</h2>

        {/* TABS HEADER */}
        <div className="flex border-b border-gray-700 shrink-0">
          {tabs.map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                      activeTab === tab.id
                          ? "text-blue-400 border-blue-400"
                          : "text-gray-400 border-transparent hover:text-gray-200"
                  }`}
              >
                {tab.label}
              </button>
          ))}
        </div>

        <div className="pt-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {/* OBS CONNECTION SETTINGS */}
          {activeTab === "obs" && (
              <section className="space-y-3">
                <h3 className="font-semibold text-gray-300">OBS WebSocket</h3>

                <label className="block">
                  <span className="text-gray-300 text-sm">WebSocket Host</span>
                  <input
                      type="text"
                      value={config.host}
                      onChange={(e) => update("host", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                      placeholder="ws://127.0.0.1:4455"
                  />
                </label>

                <label className="block">
                  <span className="text-gray-300 text-sm">Password</span>
                  <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={config.password}
                        onChange={(e) => update("password", e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100 pr-10"
                        placeholder="OBS WebSocket password"
                    />
                    <button
                        type="button"
                        onClick={toggleShowPassword}
                        className="absolute inset-y-0 right-2 text-gray-400 hover:text-gray-200 focus:outline-none"
                        title={showPassword ? "Hide password" : "Show password"}
                    >
                      {!showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-gray-300 text-sm">Reconnect Delay (ms)</span>
                  <input
                      type="number"
                      value={config.retryDelay}
                      onChange={(e) => update("retryDelay", Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                  />
                </label>
              </section>
          )}

          {/* GOOGLE SHEETS CONNECTION SETTINGS */}
          {activeTab === "google" && (
              <section className="space-y-3">
                <h3 className="font-semibold text-gray-300">Google Sheets</h3>

                <label className="block">
                  <span className="text-gray-300 text-sm">Google Sheet ID</span>
                  <input
                      type="text"
                      value={config.google.sheetId}
                      onChange={(e) => updateGoogle("sheetId", e.target.value)}
                      placeholder="e.g. 1AbCdEfGhIjKlMnOpQr..."
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Find it in the Google Sheet URL between <code>/d/</code> and <code>/edit</code>.
                  </p>
                </label>

                <label className="block">
                  <span className="text-gray-300 text-sm">Service Key File Path</span>
                  <input
                      type="text"
                      value={config.google.serviceKeyPath}
                      onChange={(e) => updateGoogle("serviceKeyPath", e.target.value)}
                      placeholder="Path to google-service-key.json"
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                  />
                </label>

                <label className="block">
                  <span className="text-gray-300 text-sm">Default Sheet (Tab Name)</span>
                  <input
                      type="text"
                      value={config.google.defaultSheet}
                      onChange={(e) => updateGoogle("defaultSheet", e.target.value)}
                      placeholder="e.g. Luni"
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input
                      type="checkbox"
                      checked={config.google.autoSync}
                      onChange={(e) => updateGoogle("autoSync", e.target.checked)}
                      className="w-4 h-4"
                  />
                  <span className="text-sm">Auto-sync schedule every morning</span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                      onClick={() => void testConnection()}
                      disabled={testing}
                      className={`px-4 py-2 rounded font-semibold ${
                          testing ? "bg-gray-600 cursor-wait" : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                  >
                    {testing ? "Testing..." : "Test Connection"}
                  </button>
                  {testResult && (
                      <span
                          className={`text-sm ${
                              testResult.startsWith("Connected") ? "text-green-400" : "text-red-400"
                          }`}
                      >
                    {testResult}
                  </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                      onClick={() => void syncSchedule()}
                      disabled={syncing}
                      className={`px-4 py-2 rounded font-semibold ${
                          syncing ? "bg-gray-600 cursor-wait" : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                  >
                    {syncing ? "Syncing..." : "Sync from Google"}
                  </button>
                  {syncMessage && <span className="text-sm text-gray-300">{syncMessage}</span>}
                </div>
              </section>
          )}

          {/* AUTOSTOP SCANNING SETTINGS */}
          {activeTab === "autostop" && (
              <section className="space-y-3">
                <h3 className="font-semibold text-gray-300">AutoStop Scanning</h3>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-300 text-sm">Lead Minutes (N min before end)</span>
                    <input
                        type="number"
                        min="1"
                        max="60"
                        value={config.autoStop.endingLeadMin}
                        onChange={(e) => updateAutoStop("endingLeadMin", Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-300 text-sm">Scanning FPS</span>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.autoStop.fps}
                        onChange={(e) => updateAutoStop("fps", Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-300 text-sm">Matching Threshold (0.0 - 1.0)</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={config.autoStop.threshold}
                        onChange={(e) => updateAutoStop("threshold", Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-300 text-sm">Required Hits</span>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={config.autoStop.requiredHits}
                        onChange={(e) => updateAutoStop("requiredHits", Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-gray-300 text-sm">Window (seconds)</span>
                    <input
                        type="number"
                        min="1"
                        max="60"
                        value={config.autoStop.windowSec}
                        onChange={(e) => updateAutoStop("windowSec", Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-gray-300 text-sm">Cooldown (seconds)</span>
                    <input
                        type="number"
                        min="1"
                        max="300"
                        value={config.autoStop.cooldownSec}
                        onChange={(e) => updateAutoStop("cooldownSec", Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
                    />
                  </label>
                </div>

                <p className="text-gray-400 text-xs mt-1">
                  Configure the sensitivity and timing of the AutoStop module. Threshold 0.2 is a good balance.
                </p>
              </section>
          )}

          {/* STOPFRAME FILTERS */}
          {activeTab === "filters" && <StopFrameFiltersSection />}
        </div>

        {/* FOOTER ACTIONS */}
        {activeTab !== "filters" && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-700 mt-4 shrink-0">
              <button
                  onClick={() => void save()}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold transition-colors"
              >
                Save Configuration
              </button>

              {saved && <span className="text-green-400 text-sm font-medium">✔ Saved successfully</span>}
            </div>
        )}
      </div>
  );
}
