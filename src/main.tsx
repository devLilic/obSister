// File: src/main.tsx
// Ensure providers are mounted once at root (no duplicate subscribes).
// Add AutoStopRuntimeProvider under StreamRuntimeProvider.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./app/index.css";
import { HashRouter, Route, Routes } from "react-router-dom";
import SettingsPage from "./pages/SettingsPage";
import MainLayout from "./components/layout/MainLayout";
import { ScheduleProvider } from "./context/ScheduleContext";
import { OBSProvider } from "./context/OBSContext";
import { StreamRuntimeProvider } from "./context/StreamRuntimeContext";
import { ScheduleStatusProvider } from "./context/ScheduleStatusContext";
import { AutoStopRuntimeProvider } from "./context/AutoStopRuntimeContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <HashRouter>
            <ScheduleProvider>
                <OBSProvider>
                    <StreamRuntimeProvider>
                        <AutoStopRuntimeProvider>
                            <ScheduleStatusProvider>
                                <MainLayout>
                                    <Routes>
                                        <Route path="/" element={<App />} />
                                        <Route path="/settings" element={<SettingsPage />} />
                                    </Routes>
                                </MainLayout>
                            </ScheduleStatusProvider>
                        </AutoStopRuntimeProvider>
                    </StreamRuntimeProvider>
                </OBSProvider>
            </ScheduleProvider>
        </HashRouter>
    </React.StrictMode>
);
