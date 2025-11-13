import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './app/index.css'
import { HashRouter, Route, Routes } from 'react-router-dom'
import SettingsPage from './pages/SettingsPage'
import MainLayout from './components/layout/MainLayout'
import { ScheduleProvider } from './context/ScheduleContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <ScheduleProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MainLayout>
      </ScheduleProvider>
    </HashRouter>
  </React.StrictMode>,
)