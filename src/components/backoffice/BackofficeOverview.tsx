import React from 'react';
import { CalendarClock, Camera, Users, Wallet } from 'lucide-react';
import {
  formatDuration,
  formatRupiah,
  formatTimeShort,
  getLocalDateString,
} from '../../lib/formatters';
import type { Attendance, Employee, Position, WorkSchedule } from '../../types/hrm';

interface BackofficeOverviewProps {
  employees: Employee[];
  positions: Position[];
  schedules: WorkSchedule[];
  attendances: Attendance[];
  onNavigate: (menu: 'overview' | 'employees' | 'schedules' | 'attendances' | 'payroll') => void;
}

export const BackofficeOverview: React.FC<BackofficeOverviewProps> = ({
  employees,
  positions,
  schedules,
  attendances,
  onNavigate,
}) => {
  const todayStr = getLocalDateString();
  const currentMonth = todayStr.slice(0, 7);

  const activeEmployees = employees.filter((e) => e.status === 'active');
  const todayAttendances = attendances.filter((a) => a.date === todayStr);
  const todayPresent = todayAttendances.filter(
    (a) => a.status === 'hadir' || a.status === 'terlambat'
  ).length;
  const todayLate = todayAttendances.filter((a) => a.status === 'terlambat').length;

  const monthlyWageTotal = attendances
    .filter((a) => a.date.startsWith(currentMonth))
    .reduce((sum, a) => sum + (a.earnedWage || 0), 0);

  const defaultSchedule = schedules.find((s) => s.isDefault) || schedules[0];

  return (
    <div className="space-y-6">
      {/* 4 KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Karyawan Aktif</span>
            <Users className="h-4 w-4 text-teal-700" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {activeEmployees.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {positions.length} jabatan terdaftar
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Hadir Hari Ini</span>
            <Camera className="h-4 w-4 text-teal-700" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {todayPresent}{' '}
            <span className="text-sm font-normal text-slate-500">/ {activeEmployees.length}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {todayLate} terlambat hari ini
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Jam Kerja Utama</span>
            <CalendarClock className="h-4 w-4 text-teal-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {defaultSchedule ? `${defaultSchedule.startTime}–${defaultSchedule.endTime}` : '08:00–17:00'}
          </p>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {defaultSchedule ? defaultSchedule.name : 'Jam Kerja Reguler'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Akumulasi Upah Bulan Ini</span>
            <Wallet className="h-4 w-4 text-teal-700" />
          </div>
          <p className="mt-2 font-mono text-xl font-bold text-teal-800 tabular-nums">
            {formatRupiah(monthlyWageTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dihitung dari hari masuk tercatat</p>
        </div>
      </div>

      {/* Live Today Attendance Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Kehadiran Hari Ini ({todayStr})
            </h2>
            <p className="text-xs text-slate-500">
              Tersinkronisasi langsung dari Mobile PWA karyawan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('attendances')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Kelola Semua Kehadiran
            </button>
            <button
              type="button"
              onClick={() => onNavigate('payroll')}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
            >
              Hitung Payroll
            </button>
          </div>
        </div>

        {todayAttendances.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada karyawan yang melakukan Clock-In hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Karyawan</th>
                  <th className="px-4 py-3 font-semibold">Jabatan</th>
                  <th className="px-4 py-3 font-semibold">Selfie</th>
                  <th className="px-4 py-3 font-semibold">Masuk</th>
                  <th className="px-4 py-3 font-semibold">Pulang</th>
                  <th className="px-4 py-3 font-semibold">Durasi</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Upah Hari Ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAttendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{att.employeeName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{att.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{att.positionTitle}</td>
                    <td className="px-4 py-3">
                      {att.clockInSelfie ? (
                        <img
                          src={att.clockInSelfie}
                          alt={`Selfie ${att.employeeName}`}
                          className="h-9 w-9 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 tabular-nums">
                      {formatTimeShort(att.clockInAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 tabular-nums">
                      {formatTimeShort(att.clockOutAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                      {formatDuration(att.workDurationMinutes)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold capitalize ${
                        att.status === 'hadir'
                          ? 'text-emerald-700'
                          : att.status === 'terlambat'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {att.status}
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900 text-right tabular-nums">
                      {formatRupiah(att.earnedWage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
