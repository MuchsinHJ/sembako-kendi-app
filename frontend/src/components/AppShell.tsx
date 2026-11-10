import { Outlet } from 'react-router-dom';
import { BottomNav } from './navigation/BottomNav';
import { SidebarNav } from './navigation/SidebarNav';

/**
 * Cangkang aplikasi (SDD FE §4.2): satu navigasi per breakpoint.
 * Mobile: BottomNav · Tablet 768–1279: sidebar 96px · Desktop ≥1280: sidebar 248px.
 */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-bg">
      <BottomNav />
      <SidebarNav variant="tablet" />
      <SidebarNav variant="desktop" />

      <main className="pb-28 md:ml-24 md:pb-8 lg:ml-[248px]">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6 lg:px-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
