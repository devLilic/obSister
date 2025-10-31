// src/components/layout/MainLayout.tsx
import { ReactNode } from "react";
import Logo from "../Logo";
import Clock from "../Clock";
import OBSStatusIndicator from "../OBSStautsIndicator";
import { Link, useLocation } from "react-router-dom";
import LogsPanel from "../obs/LogsPanel";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const isActive = (path: string) => 
    location.pathname === path
      ? "text-blue-400 font-semibold"
      : "text-gray-400 hover:text-gray-200";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-950">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="flex gap-4 text-sm font-medium transition-all">
            <Link to="/" className={isActive("/")}>📅 Schedule</Link>
            <Link to="/settings" className={isActive("/settings")}>⚙ Settings</Link>
          </nav>
        </div>

        <Clock />

        <div className="flex items-center gap-4 w-40">
          <OBSStatusIndicator />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-6 py-6">
        {children}
      </main>

      <footer className="text-gray-500 text-sm">
        <LogsPanel />

        <div className="bg-gray-800 text-center py-2 ">
          OBS Stream Manager © {new Date().getFullYear()}. Built with ❤️ by devLilic13.
        </div>
      </footer>
    </div>
  );
}
