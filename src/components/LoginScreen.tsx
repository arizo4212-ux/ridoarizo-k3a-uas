import React, { useState } from 'react';
import { Building2, Camera, CheckCircle2, LogIn, ShieldCheck, Smartphone } from 'lucide-react';
import type { AppWorkspaceMode } from '../types/hrm';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginScreenProps {
  preferredMode: AppWorkspaceMode;
  onChangePreferredMode: (mode: AppWorkspaceMode) => void;
  onGoogleLogin: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  preferredMode,
  onChangePreferredMode,
  onGoogleLogin,
  isLoading,
  errorMessage,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:grid lg:grid-cols-12">
      {/* Left Editorial Visual Panel */}
      <div className="relative lg:col-span-7 bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden min-h-[300px] lg:min-h-screen">
        {!imgFailed ? (
          <img
            src="/src/assets/images/hrm_login_workspace_1794541219759.jpg"
            alt="Ruang kerja modern KaryaSync HRM"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/35" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="font-display text-xl font-bold tracking-tight text-white">
            KaryaSync HRM
          </div>
          <PWAInstallButton compact />
        </div>

        <div className="relative z-10 max-w-xl my-auto py-8 lg:py-0">
          <p className="text-xs font-medium tracking-wide text-teal-300">
            Sistem Manajemen SDM &amp; Presensi Terpadu
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">
            Satu sumber kebenaran untuk tim manajemen dan karyawan lapangan.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed max-w-lg">
            Presensi selfie langsung dari Mobile PWA karyawan tersinkronisasi seketika ke panel
            Backoffice HR untuk rekap kehadiran dan perhitungan payroll harian otomatis.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/15 pt-6 text-sm">
            <div>
              <div className="flex items-center gap-2 font-medium text-white">
                <Camera className="h-4 w-4 text-teal-300 shrink-0" />
                <span>Selfie Presensi</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Clock-in dan clock-out kamera langsung dengan stempel waktu akurat.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 font-medium text-white">
                <Building2 className="h-4 w-4 text-teal-300 shrink-0" />
                <span>Payroll Harian</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Upah harian otomatis terhitung dari setiap hari masuk yang tercatat.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 font-medium text-white">
                <CheckCircle2 className="h-4 w-4 text-teal-300 shrink-0" />
                <span>Multi-Perangkat</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                Data tersinkron aman antar ponsel karyawan dan desktop HR.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Panel Backoffice Manajemen</span>
          <span aria-hidden="true">·</span>
          <span>Mobile PWA Karyawan</span>
          <span aria-hidden="true">·</span>
          <span>Autentikasi Terverifikasi</span>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-white">
        <div className="w-full max-w-md space-y-7">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Masuk ke Ruang Kerja
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Pilih mode portal yang ingin dibuka setelah masuk menggunakan akun Google terverifikasi Anda.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() => onChangePreferredMode('backoffice')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                preferredMode === 'backoffice'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" />
              <span>Backoffice Admin</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePreferredMode('mobile')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                preferredMode === 'mobile'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-4 w-4 shrink-0 text-teal-700" />
              <span>Mobile PWA Karyawan</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1.5">
            {preferredMode === 'backoffice' ? (
              <>
                <p className="font-semibold text-slate-900">Akses Panel Backoffice Manajemen</p>
                <p>
                  Kelola master Karyawan &amp; Jabatan, Hari &amp; Jam Kerja, verifikasi foto selfie Kehadiran,
                  serta perhitungan Payroll Harian. Khusus akun Admin / Manajemen terdaftar.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-900">Akses Aplikasi Mobile PWA Karyawan</p>
                <p>
                  Lakukan Clock-In &amp; Clock-Out foto selfie, pantau Beranda, riwayat Presensi,
                  Laporan kehadiran, serta Profil Biodata &amp; rincian Gaji harian Anda.
                </p>
              </>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            onClick={onGoogleLogin}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px]"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>{isLoading ? 'Memverifikasi Sesi...' : 'Masuk dengan Akun Google'}</span>
          </button>

          <p className="text-xs text-slate-500 leading-relaxed">
            Sesi login terenkripsi menyinkronkan profil karyawan, foto presensi, dan slip gaji secara
            real-time di semua perangkat Anda.
          </p>
        </div>
      </div>
    </div>
  );
};
