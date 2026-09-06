import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { Ambient3DBackground } from '../ui/Ambient3DBackground';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface-sunken flex flex-col relative overflow-hidden">
      {/* 3D Parallax & Ambient Glow Layer */}
      <Ambient3DBackground />

      {/* Top Navbar */}
      <TopNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
