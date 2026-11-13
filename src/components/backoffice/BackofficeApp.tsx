import React, { useState } from 'react';
import {
  CalendarClock,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  Smartphone,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { Attendance, Employee, PayrollRecord, Position, WorkSchedule } from '../../types/hrm';
import { PWAInstallButton } from '../PWAInstallButton';
import { AttendancesView } from './AttendancesView';
import { BackofficeOverview } from './BackofficeOverview';
import { EmployeesPositionsView } from './EmployeesPositionsView';
import { PayrollView } from './PayrollView';
import { SchedulesView } from './SchedulesView';

type BackofficeMenu = 'overview' | 'employees' | 'schedules' | 'attendances' | 'payroll';

interface BackofficeAppProps {
  adminEmail: string;
  employees: Employee[];
  positions: Position[];
  schedules: WorkSchedule[];
  attendances: Attendance[];
  payrolls: PayrollRecord[];
  onSwitchToMobile: () => void;
  onLogout: () => void;
}

const MENU_ITEMS: {
  id: BackofficeMenu;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'employees', label: 'Karyawan & Jabatan', icon: Users },
  { id: 'schedules', label: 'Hari & Jam Kerja', icon: CalendarClock },
  { id: 'attendances', label: 'Data Kehadiran', icon: Camera },
  { id: 'payroll', label: 'Payroll Harian', icon: Wallet },
];

export const BackofficeApp: React.FC<BackofficeAppProps> = ({
  adminEmail,
  employees,
  positions,
  schedules,
  attendances,
  payrolls,
  onSwitchToMobile,
  onLogout,
}) => {
  const [activeMenu, setActiveMenu] = useState<BackofficeMenu>('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentLabel = MENU_ITEMS.find((m) => m.id === activeMenu)?.label || 'Ringkasan';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center px-6 border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            KaryaSync Backoffice
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">Administrator HR</p>
            <p className="text-slate-500 truncate">{adminEmail}</p>
          </div>
          <button
            type="button"
            onClick={onSwitchToMobile}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Smartphone className="h-3.5 w-3.5 text-teal-700" />
            <span>Buka Mobile PWA</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white h-full flex flex-col border-r border-slate-200">
            <div className="flex h-14 items-center justify-between px-5 border-b border-slate-200">
              <span className="font-display text-base font-bold text-slate-900">
                KaryaSync Backoffice
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveMenu(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={onSwitchToMobile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Smartphone className="h-4 w-4 text-teal-700" />
                <span>Buka Mobile PWA</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-400 hidden sm:inline">Manajemen SDM</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display font-bold text-slate-900 truncate">{currentLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={onSwitchToMobile}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Smartphone className="h-3.5 w-3.5 text-teal-700" />
              <span>Mode Karyawan PWA</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {activeMenu === 'overview' && (
            <BackofficeOverview
              employees={employees}
              positions={positions}
              schedules={schedules}
              attendances={attendances}
              onNavigate={setActiveMenu}
            />
          )}
          {activeMenu === 'employees' && (
            <EmployeesPositionsView
              employees={employees}
              positions={positions}
              schedules={schedules}
            />
          )}
          {activeMenu === 'schedules' && <SchedulesView schedules={schedules} />}
          {activeMenu === 'attendances' && (
            <AttendancesView employees={employees} attendances={attendances} />
          )}
          {activeMenu === 'payroll' && (
            <PayrollView employees={employees} attendances={attendances} payrolls={payrolls} />
          )}
        </main>
      </div>
    </div>
  );
};
