import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Clock, LogOut, Wallet } from 'lucide-react';
import {
  DAY_LABELS,
  formatDateIndo,
  formatDuration,
  formatRupiah,
  formatTimeShort,
  getDayCode,
  getLocalDateString,
} from '../../lib/formatters';
import type { Attendance, Employee, WorkSchedule } from '../../types/hrm';

interface MobileHomeTabProps {
  employee: Employee;
  schedule: WorkSchedule | null;
  attendances: Attendance[];
  onOpenSelfieModal: (mode: 'clock-in' | 'clock-out') => void;
  onNavigateTab: (tab: 'beranda' | 'presensi' | 'laporan' | 'profil') => void;
}

export const MobileHomeTab: React.FC<MobileHomeTabProps> = ({
  employee,
  schedule,
  attendances,
  onOpenSelfieModal,
  onNavigateTab,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayStr = getLocalDateString(now);
  const currentMonth = todayStr.slice(0, 7);
  const todayAttendance = attendances.find((a) => a.date === todayStr) || null;

  const monthlyRecords = attendances.filter((a) => a.date.startsWith(currentMonth));
  const monthlyPresentDays = monthlyRecords.filter(
    (a) => a.status === 'hadir' || a.status === 'terlambat'
  ).length;
  const monthlyEstimatedPay = monthlyRecords.reduce((sum, a) => sum + (a.earnedWage || 0), 0);

  const todayCode = getDayCode(now);
  const isWorkDay = schedule ? schedule.workDays.includes(todayCode) : true;
  const hasClockedIn = Boolean(todayAttendance?.clockInAt);
  const hasClockedOut = Boolean(todayAttendance?.clockOutAt);

  const timeFormatted = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return (
    <div className="space-y-6">
      {/* Greeting & Live Shift Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {employee.employeeCode} · {employee.positionTitle}
              </p>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-900">
                Halo, {employee.fullName}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{dateFormatted}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {timeFormatted}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                {schedule
                  ? `${schedule.name} · ${schedule.startTime} – ${schedule.endTime}`
                  : 'Jam Kerja Reguler · 08:00 – 17:00'}
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Hari Kerja:{' '}
              <strong className="font-medium text-slate-900">
                {schedule
                  ? schedule.workDays.map((d) => DAY_LABELS[d] || d).join(', ')
                  : 'Sen, Sel, Rab, Kam, Jum'}
              </strong>
            </span>
            <span className={isWorkDay ? 'text-teal-700 font-medium' : 'text-amber-700 font-medium'}>
              {isWorkDay ? 'Hari Kerja Aktif' : 'Hari Libur Terjadwal'}
            </span>
          </div>

          {/* Primary Clock-In / Clock-Out Selfie CTA */}
          <div className="mt-5">
            {!hasClockedIn ? (
              <button
                type="button"
                disabled={employee.status !== 'active'}
                onClick={() => onOpenSelfieModal('clock-in')}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-teal-700 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.99] disabled:opacity-50 min-h-[52px]"
              >
                <Camera className="h-5 w-5 shrink-0" />
                <span>Clock-In Sekarang (Foto Selfie)</span>
              </button>
            ) : !hasClockedOut ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {todayAttendance?.clockInSelfie ? (
                      <img
                        src={todayAttendance.clockInSelfie}
                        alt="Selfie Clock-In"
                        className="h-11 w-11 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-slate-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        Tercatat Masuk · {formatTimeShort(todayAttendance?.clockInAt || '')}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Status:{' '}
                        <span className="capitalize font-medium text-slate-700">
                          {todayAttendance?.status}
                        </span>{' '}
                        · Upah hari ini {formatRupiah(todayAttendance?.earnedWage || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSelfieModal('clock-out')}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.99] min-h-[52px]"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>Clock-Out Sekarang (Foto Selfie)</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">
                      Presensi Hari Ini Selesai
                    </p>
                    <p className="text-xs text-emerald-800 tabular-nums">
                      Masuk {formatTimeShort(todayAttendance?.clockInAt || '')} · Pulang{' '}
                      {formatTimeShort(todayAttendance?.clockOutAt || '')} · Durasi{' '}
                      {formatDuration(todayAttendance?.workDurationMinutes || 0)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-emerald-800">Upah Hari Ini</p>
                  <p className="font-mono text-sm font-bold text-emerald-950 tabular-nums">
                    {formatRupiah(todayAttendance?.earnedWage || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Summary Metrics Column */}
        <section className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Kehadiran Bulan Ini</span>
              <Clock className="h-4 w-4 text-teal-700" />
            </div>
            <div className="mt-3">
              <div className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {monthlyPresentDays} <span className="text-sm font-normal text-slate-500">hari</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tarif harian {formatRupiah(employee.dailyRate)} / hari
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Akumulasi Upah Berjalan</span>
              <Wallet className="h-4 w-4 text-teal-700" />
            </div>
            <div className="mt-3">
              <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                {formatRupiah(monthlyEstimatedPay)}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Dihitung otomatis dari hari tercatat masuk
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Attendance Feed */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Aktivitas Presensi Terbaru
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('presensi')}
            className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
          >
            Lihat Semua
          </button>
        </div>

        {attendances.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Belum ada catatan presensi. Ketuk tombol Clock-In Foto Selfie di atas untuk mencatat kehadiran pertama Anda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attendances.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.clockInSelfie ? (
                    <img
                      src={item.clockInSelfie}
                      alt={`Selfie ${item.date}`}
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {formatDateIndo(item.date)}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Masuk {formatTimeShort(item.clockInAt)} · Pulang {formatTimeShort(item.clockOutAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-semibold capitalize ${
                      item.status === 'hadir'
                        ? 'text-emerald-700'
                        : item.status === 'terlambat'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                    }`}
                  >
                    {item.status}
                  </p>
                  <p className="font-mono text-xs text-slate-600 tabular-nums">
                    {formatRupiah(item.earnedWage)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
