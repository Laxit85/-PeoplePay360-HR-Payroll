import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface-sunken flex flex-col">
      <TopNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
