import { useEffect, useState } from "react";

interface OBSConfig {
  host: string;
  password: string;
  retryDelay: number;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<OBSConfig>({
    host: "",
    password: "",
    retryDelay: 5000,
  });

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    window.api.config.get().then((data) => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  const update = (key: keyof OBSConfig, value: any) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const result = await window.api.config.save(config);
    setSaved(result.success);
    if (!result.success) alert("Failed to save config: " + result.error);
  };

  if (loading)
    return (
        <div className="text-gray-400">Loading configuration...</div>
    );

  return (
      <div className="bg-gray-900 text-gray-100 p-6 rounded border border-gray-700 max-w-md w-full">
        <h2 className="text-xl font-semibold text-blue-400 mb-4">
          ⚙️ OBS Connection Settings
        </h2>

        <label className="block mb-3">
          <span className="text-gray-300 text-sm">WebSocket Host</span>
          <input
            type="text"
            value={config.host}
            onChange={(e) => update("host", e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
            placeholder="ws://127.0.0.1:4455"
          />
        </label>

        <label className="block mb-3">
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


        <label className="block mb-5">
          <span className="text-gray-300 text-sm">Reconnect Delay (ms)</span>
          <input
            type="number"
            value={config.retryDelay}
            onChange={(e) => update("retryDelay", Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-gray-100"
          />
        </label>

        <div className="flex justify-between items-center">
          <button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Save
          </button>

          {saved && (
            <span className="text-green-400 text-sm">✔ Saved successfully</span>
          )}
        </div>
      </div>
  );
}
