import React, { useState } from 'react';
import {
  BarChart3,
  Camera,
  Home,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import { getLocalDateString } from '../../lib/formatters';
import { clockInWithSelfie, clockOutWithSelfie } from '../../services/hrmService';
import type { Attendance, Employee, PayrollRecord, WorkSchedule } from '../../types/hrm';
import { PWAInstallButton } from '../PWAInstallButton';
import { SelfieCameraModal } from '../SelfieCameraModal';
import { MobileAttendanceTab } from './MobileAttendanceTab';
import { MobileHomeTab } from './MobileHomeTab';
import { MobileProfileTab } from './MobileProfileTab';
import { MobileReportTab } from './MobileReportTab';

type MobileTab = 'beranda' | 'presensi' | 'laporan' | 'profil';

interface MobilePWAAppProps {
  employee: Employee;
  schedule: WorkSchedule | null;
  attendances: Attendance[];
  payrolls: PayrollRecord[];
  isAdmin: boolean;
  onSwitchToBackoffice: () => void;
  onLogout: () => void;
}

export const MobilePWAApp: React.FC<MobilePWAAppProps> = ({
  employee,
  schedule,
  attendances,
  payrolls,
  isAdmin,
  onSwitchToBackoffice,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('beranda');
  const [selfieModalMode, setSelfieModalMode] = useState<'clock-in' | 'clock-out' | null>(null);

  const todayStr = getLocalDateString();
  const todayAttendance = attendances.find((a) => a.date === todayStr) || null;

  const handleConfirmSelfie = async (payload: {
    selfieDataUrl: string;
    locationText: string;
    notes: string;
  }) => {
    if (selfieModalMode === 'clock-in') {
      await clockInWithSelfie({
        employee,
        schedule,
        selfieDataUrl: payload.selfieDataUrl,
        locationText: payload.locationText,
        notes: payload.notes,
      });
    } else if (selfieModalMode === 'clock-out' && todayAttendance) {
      await clockOutWithSelfie({
        attendance: todayAttendance,
        selfieDataUrl: payload.selfieDataUrl,
        locationText: payload.locationText,
        notes: payload.notes,
      });
    }
  };

  const tabs: { id: MobileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'presensi', label: 'Presensi', icon: Camera },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 lg:pb-12">
      {/* Compact Sticky Top App Bar (56px) */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            KaryaSync PWA
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'border-teal-700 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            {isAdmin && (
              <button
                type="button"
                onClick={onSwitchToBackoffice}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-teal-700" />
                <span className="hidden sm:inline">Panel Backoffice</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[40px] min-w-[40px]"
              title="Keluar"
              aria-label="Keluar dari akun"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {activeTab === 'beranda' && (
          <MobileHomeTab
            employee={employee}
            schedule={schedule}
            attendances={attendances}
            onOpenSelfieModal={(mode) => setSelfieModalMode(mode)}
            onNavigateTab={setActiveTab}
          />
        )}
        {activeTab === 'presensi' && (
          <MobileAttendanceTab
            employee={employee}
            attendances={attendances}
            onOpenSelfieModal={(mode) => setSelfieModalMode(mode)}
          />
        )}
        {activeTab === 'laporan' && (
          <MobileReportTab employee={employee} attendances={attendances} />
        )}
        {activeTab === 'profil' && (
          <MobileProfileTab
            employee={employee}
            attendances={attendances}
            payrolls={payrolls}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Tab Bar */}
      <nav
        aria-label="Navigasi Mobile Karyawan"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden pb-safe"
      >
        <div className="grid grid-cols-4 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors ${
                  active ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Selfie Clock-In / Clock-Out Modal */}
      {selfieModalMode && (
        <SelfieCameraModal
          mode={selfieModalMode}
          employeeName={employee.fullName}
          onClose={() => setSelfieModalMode(null)}
          onConfirm={handleConfirmSelfie}
        />
      )}
    </div>
  );
};
