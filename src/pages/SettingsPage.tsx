import { useEffect, useState } from "react";
import { OBSConfig } from "../../electron/types/types";

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

export default function SettingsPage() {
  const [config, setConfig] = useState<OBSConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const syncSchedule = async () => {
    setSyncing(true);
    const result = await window.api.google.syncSchedule();
    setSyncMessage(result.message);
    setSyncing(false);
  };

  useEffect(() => {
    window.api.config.get().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);


  const testConnection = async () => {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    const result = await window.api.google.testConnection(
      config.google.sheetId,
      config.google.serviceKeyPath,
      config.google.defaultSheet
    );
    setTestResult(result.message);
    setTesting(false);
  };

  const update = (key: keyof OBSConfig, value: any) =>
    setConfig((prev) => (prev ? { ...prev, [key]: value } : defaultConfig));

  const updateGoogle = (key: keyof OBSConfig["google"], value: any) =>
    setConfig((prev) =>
      prev ? { ...prev, google: { ...prev.google, [key]: value } } : defaultConfig
    );

  const save = async () => {
    if (!config) return;
    const result = await window.api.config.save(config);
    setSaved(result.success);
    if (!result.success) alert("Failed to save config: " + result.error);
  };

  if (loading)
    return <div className="text-gray-400">Loading configuration...</div>;

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded border border-gray-700 max-w-2xl w-full space-y-6">
      <h2 className="text-xl font-semibold text-blue-400 mb-4">
        ⚙️ OBS & Google Sheets Settings
      </h2>

      {/* OBS CONNECTION SETTINGS */}
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
              onClick={() => setShowPassword(!showPassword)}
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

      {/* GOOGLE SHEETS CONNECTION SETTINGS */}
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
            Find it in the Google Sheet URL between <code>/d/</code> and
            <code>/edit</code>.
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
            onClick={testConnection}
            disabled={testing}
            className={`px-4 py-2 rounded font-semibold ${
              testing
                ? "bg-gray-600 cursor-wait"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {testResult && (
            <span
              className={`text-sm ${
                testResult.startsWith("Connected")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {testResult}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={syncSchedule}
            disabled={syncing}
            className={`px-4 py-2 rounded font-semibold ${
              syncing ? "bg-gray-600 cursor-wait" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {syncing ? "Syncing..." : "Sync from Google"}
          </button>
          {syncMessage && (
            <span className="text-sm text-gray-300">{syncMessage}</span>
          )}
        </div>

      </section>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={save}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
        >
          Save
        </button>

        {saved && (
          <span className="text-green-400 text-sm">
            ✔ Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
