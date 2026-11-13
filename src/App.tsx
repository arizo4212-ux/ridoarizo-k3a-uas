import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { registerSW } from 'virtual:pwa-register';
import { BackofficeApp } from './components/backoffice/BackofficeApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { MobilePWAApp } from './components/mobile/MobilePWAApp';
import { OfflineIndicator } from './components/OfflineIndicator';
import { auth, googleProvider, testFirestoreConnection } from './lib/firebase';
import {
  checkIsUserAdmin,
  ensureBootstrapDataForAdmin,
  ensureEmployeeLinked,
  subscribeAdminCollections,
  subscribeEmployeeCollections,
} from './services/hrmService';
import type {
  AppWorkspaceMode,
  Attendance,
  Employee,
  PayrollRecord,
  Position,
  WorkSchedule,
} from './types/hrm';

function AppShell() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [preferredMode, setPreferredMode] = useState<AppWorkspaceMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('karyasync_mode');
      if (saved === 'backoffice' || saved === 'mobile') return saved;
      return window.innerWidth < 768 ? 'mobile' : 'backoffice';
    }
    return 'backoffice';
  });

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [syncReady, setSyncReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Admin Datasets
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [allPayrolls, setAllPayrolls] = useState<PayrollRecord[]>([]);

  // Employee Datasets
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [mySchedule, setMySchedule] = useState<WorkSchedule | null>(null);
  const [myAttendances, setMyAttendances] = useState<Attendance[]>([]);
  const [myPayrolls, setMyPayrolls] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    registerSW({ immediate: true });
    testFirestoreConnection();
  }, []);

  const handleModeChange = (mode: AppWorkspaceMode) => {
    setPreferredMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('karyasync_mode', mode);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setSyncError(null);
      if (!nextUser) {
        setIsAdmin(false);
        setCurrentEmployee(null);
        setSyncReady(false);
        setAuthReady(true);
        return;
      }

      if (!nextUser.emailVerified) {
        setLoginError('Email akun Google Anda belum terverifikasi.');
        setAuthReady(true);
        return;
      }

      try {
        const adminFlag = await checkIsUserAdmin(nextUser);
        setIsAdmin(adminFlag);
        if (adminFlag) {
          await ensureBootstrapDataForAdmin(nextUser);
        } else {
          // Non-admins always land in Mobile PWA Employee Mode
          setPreferredMode('mobile');
        }
        const linkedEmp = await ensureEmployeeLinked(nextUser, adminFlag);
        setCurrentEmployee(linkedEmp);
        setSyncReady(true);
      } catch (err) {
        setSyncError(
          err instanceof Error ? err.message : 'Gagal menyinkronkan profil pengguna.'
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Realtime subscriptions when authenticated & synced
  useEffect(() => {
    if (!user || !syncReady) return;

    const unsubs: (() => void)[] = [];

    if (isAdmin && preferredMode === 'backoffice') {
      unsubs.push(
        subscribeAdminCollections({
          onEmployees: setAllEmployees,
          onPositions: setPositions,
          onSchedules: setSchedules,
          onAttendances: setAllAttendances,
          onPayrolls: setAllPayrolls,
          onError: (err) => setSyncError(err.message),
        })
      );
    } else if (currentEmployee) {
      unsubs.push(
        subscribeEmployeeCollections(user.uid, currentEmployee.scheduleId, {
          onEmployee: (emp) => {
            if (emp) setCurrentEmployee(emp);
          },
          onSchedule: setMySchedule,
          onAttendances: setMyAttendances,
          onPayrolls: setMyPayrolls,
          onError: (err) => setSyncError(err.message),
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user, syncReady, isAdmin, preferredMode, currentEmployee?.scheduleId]);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    setUnauthorizedDomain(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      if (msg.includes('popup-closed-by-user')) {
        setLoginError('Jendela login Google ditutup sebelum selesai. Silakan coba lagi.');
      } else if (msg.includes('unauthorized-domain')) {
        setLoginError('Domain saat ini belum diotorisasi di Firebase Authentication.');
        setUnauthorizedDomain(typeof window !== 'undefined' ? window.location.hostname : null);
      } else {
        setLoginError(msg);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <div className="h-9 w-9 rounded-xl bg-slate-900 mx-auto animate-pulse" />
          <p className="text-xs font-medium text-slate-500">Memuat KaryaSync HRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen
          preferredMode={preferredMode}
          onChangePreferredMode={handleModeChange}
          onGoogleLogin={handleGoogleLogin}
          isLoading={loginLoading}
          errorMessage={loginError}
          unauthorizedDomain={unauthorizedDomain}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Sinkronisasi Database Terhenti
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Koneksi ke database real-time mengalami kendala izin atau jaringan.
          </p>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 font-mono text-[11px] text-rose-800 break-words max-h-36 overflow-y-auto">
            {syncError}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!syncReady || !currentEmployee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <div className="h-9 w-9 rounded-xl bg-teal-700 mx-auto animate-pulse" />
          <p className="text-xs font-medium text-slate-500">
            Menyinkronkan data akun dan perangkat...
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin && preferredMode === 'backoffice') {
    return (
      <>
        <BackofficeApp
          adminEmail={user.email || ''}
          employees={allEmployees}
          positions={positions}
          schedules={schedules}
          attendances={allAttendances}
          payrolls={allPayrolls}
          onSwitchToMobile={() => handleModeChange('mobile')}
          onLogout={handleLogout}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <>
      <MobilePWAApp
        employee={currentEmployee}
        schedule={mySchedule}
        attendances={myAttendances}
        payrolls={myPayrolls}
        isAdmin={isAdmin}
        onSwitchToBackoffice={() => handleModeChange('backoffice')}
        onLogout={handleLogout}
      />
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
