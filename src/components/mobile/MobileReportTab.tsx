import React, { useState } from 'react';
import {
  formatDateIndo,
  formatDuration,
  formatRupiah,
  formatTimeShort,
  getLocalDateString,
  getMonthBounds,
} from '../../lib/formatters';
import type { Attendance, Employee } from '../../types/hrm';

interface MobileReportTabProps {
  employee: Employee;
  attendances: Attendance[];
}

export const MobileReportTab: React.FC<MobileReportTabProps> = ({ employee, attendances }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalDateString().slice(0, 7));
  const { label } = getMonthBounds(selectedMonth);

  const records = attendances.filter((a) => a.date.startsWith(selectedMonth));
  const hadirCount = records.filter((r) => r.status === 'hadir').length;
  const terlambatCount = records.filter((r) => r.status === 'terlambat').length;
  const izinCount = records.filter((r) => r.status === 'izin').length;
  const alphaCount = records.filter((r) => r.status === 'alpha').length;
  const totalMinutes = records.reduce((s, r) => s + (r.workDurationMinutes || 0), 0);
  const totalEarned = records.reduce((s, r) => s + (r.earnedWage || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Laporan Kehadiran &amp; Upah Harian
          </h2>
          <p className="text-xs text-slate-500">
            Periode {label} · Tarif {formatRupiah(employee.dailyRate)} / hari masuk
          </p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none min-h-[40px]"
          aria-label="Pilih bulan laporan"
        />
      </div>

      {/* 4-column Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Hari Masuk</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {hadirCount + terlambatCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hadirCount} tepat waktu · {terlambatCount} terlambat
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Izin / Alpha</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {izinCount + alphaCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {izinCount} izin · {alphaCount} alpha
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Jam Kerja</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatDuration(totalMinutes)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Akumulasi durasi tercatat</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Upah Tercatat</p>
          <p className="mt-1.5 font-mono text-lg sm:text-xl font-bold text-teal-800 tabular-nums">
            {formatRupiah(totalEarned)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Basis gajian harian</p>
        </div>
      </div>

      {/* Ledger Table */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Rincian Perhitungan Harian
          </h3>
        </div>

        {records.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada catatan kehadiran pada bulan {label}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Jam Masuk / Pulang</th>
                  <th className="px-4 py-3 font-semibold">Durasi</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Upah Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {formatDateIndo(r.date)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatTimeShort(r.clockInAt)} – {formatTimeShort(r.clockOutAt)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDuration(r.workDurationMinutes)}
                    </td>
                    <td
                      className={`px-4 py-3.5 font-semibold capitalize whitespace-nowrap ${
                        r.status === 'hadir'
                          ? 'text-emerald-700'
                          : r.status === 'terlambat'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {r.status}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                      {formatRupiah(r.earnedWage)}
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
